const CDX_BASE = "https://web.archive.org/cdx/search/cdx";
const AVAILABILITY_API = "https://archive.org/wayback/available";

async function cdxFetch(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status === 503) {
        if (attempt < retries - 1) {
          await sleep((attempt + 1) * 2000);
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt === retries - 1) return null;
      await sleep((attempt + 1) * 2000);
    }
  }
  return null;
}

export function buildCDXUrl(url, params = {}) {
  const base = `${CDX_BASE}?url=${encodeURIComponent(url)}&matchType=exact&output=json`;
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return query ? `${base}&${query}` : base;
}

export async function getFirstCapture(url) {
  const apiUrl = buildCDXUrl(url, { fl: "timestamp", limit: 1 });
  const data = await cdxFetch(apiUrl);
  return data?.[1]?.[0] ?? null;
}

export async function getLastCapture(url) {
  const apiUrl = buildCDXUrl(url, { fl: "timestamp", limit: -1, fastLatest: "true" });
  const data = await cdxFetch(apiUrl, 3);
  return data?.[1]?.[0] ?? null;
}

export async function getAvailability(url) {
  try {
    const res = await fetch(`${AVAILABILITY_API}?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.archived_snapshots?.closest ?? null;
  } catch {
    return null;
  }
}

export async function getPageHealth(url) {
  const [firstTs, lastTs, sample] = await Promise.all([
    getFirstCapture(url),
    getLastCapture(url),
    getCollapsedSample(url),
  ]);

  if (!firstTs && !lastTs && (!sample || sample.length < 2)) return null;

  const entries = sample?.slice(1) ?? [];
  const total = entries.length;
  const isTruncated = total >= 10000;

  const statusCounts = {};
  for (const [, status] of entries) {
    const s = status || "-";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const sortedStatuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a);

  return {
    total: total || 0,
    totalLabel: formatCount(total),
    firstArchived: formatTimestamp(firstTs),
    lastArchived: formatTimestamp(lastTs),
    isTruncated,
    statusDistribution: sortedStatuses.map(([code, count]) => ({
      code,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      colors: getStatusColor(code),
    })),
  };
}

async function getCollapsedSample(url) {
  const apiUrl = buildCDXUrl(url, {
    fl: "timestamp,statuscode",
    collapse: "timestamp:8",
    limit: 10000,
  });
  return cdxFetch(apiUrl);
}

function getStatusColor(code) {
  if (!code || code === "-") return { color: "#999999", bg: "#F5F5F5" };
  const c = String(code);
  if (c.startsWith("2")) return { color: "#247500", bg: "#F0FAE6" };
  if (c.startsWith("3")) return { color: "#905B00", bg: "#FFF5E6" };
  if (c.startsWith("4")) return { color: "#D0021B", bg: "#FFF0F0" };
  if (c.startsWith("5")) return { color: "#D0021B", bg: "#FFF0F0" };
  return { color: "#666666", bg: "#F5F5F5" };
}

function formatCount(n) {
  if (!n || isNaN(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}

function formatTimestamp(ts) {
  if (!ts || ts.length < 8) return "Unknown";
  const year = ts.substring(0, 4);
  const month = ts.substring(4, 6);
  const day = ts.substring(6, 8);
  const date = new Date(+year, +month - 1, +day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

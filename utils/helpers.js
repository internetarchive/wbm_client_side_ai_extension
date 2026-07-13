export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function isPlaybackPage(url) {
  return url && /web\.archive\.org\/web\/\d{14}/.test(url);
}

export function formatDate(ts) {
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

export function getStatusColor(code) {
  if (!code || code === "-") return { color: "#999999", bg: "#F5F5F5" };
  const c = String(code);
  if (c.startsWith("2")) return { color: "#247500", bg: "#F0FAE6" };
  if (c.startsWith("3")) return { color: "#905B00", bg: "#FFF5E6" };
  if (c.startsWith("4")) return { color: "#D0021B", bg: "#FFF0F0" };
  if (c.startsWith("5")) return { color: "#D0021B", bg: "#FFF0F0" };
  return { color: "#666666", bg: "#F5F5F5" };
}

export function formatCount(n) {
  if (!n || isNaN(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}

export function parsePlaybackUrl(playbackUrl) {
  const match = playbackUrl.match(/web\.archive\.org\/web\/(\d{14})(?:id_|if_|js_|cs_|im_|fl_)?\/(.+)/);
  if (!match) return null;
  const timestamp = match[1];
  const originalUrl = decodeURIComponent(match[2]);
  return {
    ts: timestamp,
    url: originalUrl 
  }
}

export function parseDiff(diff) {
  let addedCount = 0;
  let removedCount = 0;
  const rawLines = [];

  for(let chunk of diff) {
    if(chunk.type === 'unchanged') {
      continue;
    }
    const wordCount = chunk.value.split(/\s+/).filter(Boolean).length;
    if(chunk.type === 'added') {
      addedCount += wordCount;
      if (rawLines.length < 200) rawLines.push(`+ ${chunk.value.trim()}`); 
    }
    else if(chunk.type === "removed") {
      removedCount += wordCount;
      if (rawLines.length < 200) rawLines.push(`- ${chunk.value.trim()}`);
    }
  }
  const diffLines = rawLines.join('\n');
  return {
    addedCount,
    removedCount,
    diffLines
  }
}

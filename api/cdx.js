import { sleep, formatDate, getStatusColor, formatCount, parsePlaybackUrl } from "../utils/helpers.js";

export class cdxBase {
  #CDX_BASE = "https://web.archive.org/cdx/search/cdx";

  constructor(){}

  async #cdxFetch(url, retries = 3) {
    for(let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 429 || res.status === 503) {
          if(attempt < retries - 1) {
            await sleep((attempt + 1) * 2000);
            continue;
          }
          return null;
        }
        if(!res.ok) return null;
        return await res.json();
      } catch (error) {
        if(attempt === retries - 1) {
          return null;
        }
        await sleep((attempt + 1) * 2000);
      }
    }
    return null;
  } 

  #buildCDXUrl(url, params = {}) {
    const base = `${this.#CDX_BASE}?url=${encodeURIComponent(url)}&matchType=exact&output=json`;
    const parameterArray = Object.entries(params);
    const query = parameterArray.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return query ? `${base}&${query}` : base;
  }

  async #getCollapsedSample(url) {
    const apiUrl = this.#buildCDXUrl(url, {
      fl: "timestamp,statuscode",
      collapse: "timestamp:8",
      limit: 10000,
    });
    return await this.#cdxFetch(apiUrl);
  }

  async getFirstCapture(url) {
    const apiUrl = this.#buildCDXUrl(url, { fl: "timestamp", limit: 1 });
    const data = await this.#cdxFetch(apiUrl);
    return data?.[1]?.[0] ?? null;
  }

  async getLastCapture(url) {
    const apiUrl = this.#buildCDXUrl(url, { fl: "timestamp", limit: -1, fastLatest: "true" });
    const data = await this.#cdxFetch(apiUrl, 3);
    return data?.[1]?.[0] ?? null;
  } 

  async getAvailability_CDX(url) {
    const ts = await this.getFirstCapture(url);
    if(!ts) return null;
    const apiUrl = this.#buildCDXUrl(url, { fl: "statuscode", from: ts, to: ts });
    const data = await this.#cdxFetch(apiUrl);
    const status = data?.[1]?.[0] || "200";
    return {
    status,
      available: true,
      url: `https://web.archive.org/web/${ts}/${url}`,
      timestamp: ts,
    };
  }

  async getTimelineData(playbackUrl = "", url = "") {
    let originalUrl = url;

    if (playbackUrl !== "") {
      const urlData = parsePlaybackUrl(playbackUrl);
      if(!urlData) return [];
      originalUrl = urlData.url;
    }

    if (!originalUrl) return [];

    const apiUrl = this.#buildCDXUrl(originalUrl, {
      fl: "timestamp,statuscode",
      collapse: "timestamp:6",
      limit: 500
    });
    const data = await this.#cdxFetch(apiUrl);
    if(!data || data.length < 2) return [];
    const rows = data.slice(1);
    const years = {};
    for (const [ts, status] of rows) {
      const year = ts.substring(0, 4);
      const month = parseInt(ts.substring(4, 6), 10);
      if (!years[year]) years[year] = Array(12).fill(null);
      if (years[year][month - 1] === null) {
        years[year][month - 1] = { status: status || "-", ts };
      }
    }
    return Object.entries(years).map(([year, months]) => ({ year: parseInt(year), months }));
  }

  async getSnapshotStatus_quality(playbackUrl) {
    const urlData = parsePlaybackUrl(playbackUrl);
    if(!urlData) return { status: "unavailable", codes: [] };
    const timestamp = urlData.ts;
    const originalUrl = urlData.url;

    const apiUrl = this.#buildCDXUrl(originalUrl, {
      fl: "statuscode,mimetype",
      from: timestamp,
      to: timestamp,
    });

    const data = await this.#cdxFetch(apiUrl);
    if (!data || data.length < 2) return { status: "unavailable", codes: [] };

    const rawRows = data.slice(1);
    const rawCodes = rawRows.map(row => row[0]);
    const codes = [...new Set(rawCodes)].filter(c => c && c !== "-");

    if (codes.length === 0) {
      const isRevisit = rawRows.some(row => (row[1] || "").includes("revisit"));
      return { status: "unrecorded", codes: [], isRevisit };
    }
    if (codes.length === 1) {
      return { status: "confirmed", codes };
    }
    return { status: "chain", codes };
  }

  async getPageHealth(playbackUrl = "", url = "") {
    let originalUrl = url;

    if(playbackUrl !== "") {
      const urlData = parsePlaybackUrl(playbackUrl);
      if(!urlData) return null; 
      originalUrl = urlData.url;
    }
    
    if(!originalUrl) return null;

    const [firstTs, lastTs, sample] = await Promise.all([
      this.getFirstCapture(originalUrl),
      this.getLastCapture(originalUrl),
      this.#getCollapsedSample(originalUrl),
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
      firstArchived: formatDate(firstTs),
      lastArchived: formatDate(lastTs),
      isTruncated,
      statusDistribution: sortedStatuses.map(([code, count]) => ({
        code,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        colors: getStatusColor(code),
      })),
    };
  }
}

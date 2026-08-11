import { cdxBase } from "../api/cdx.js";
import { isPlaybackPage, formatDate, parsePlaybackUrl } from "../utils/helpers.js";

const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_PREFIX_HEALTH = "wbm_health_";
const CACHE_PREFIX_TIMELINE = "wbm_timeline_";
const cdx = new cdxBase();

document.addEventListener("DOMContentLoaded", () => {
  const languageSelect = document.getElementById("language-select");
  const saveButton = document.getElementById("save-button");
  const statusMessage = document.getElementById("status-message");
  chrome.storage.sync.get(["targetLanguage"], (result) => {
    if (result.targetLanguage) {
      languageSelect.value = result.targetLanguage;
    } else {
      languageSelect.value = "en";
    }
  });

  saveButton.addEventListener("click", () => {
    const selectedLanguage = languageSelect.value;
    chrome.storage.sync.set({ targetLanguage: selectedLanguage }, () => {
      statusMessage.textContent = "Saved!";
      setTimeout(() => {
        statusMessage.textContent = "";
      }, 2000);
    });
  });

  document.querySelectorAll(".action-card:not(.action-card--disabled)").forEach((card) => {
    if (card.dataset.action === "more") return;
    card.addEventListener("click", () => {
      const action = card.dataset.action;
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab) {
          chrome.runtime.sendMessage({ type: "PERFORM_ACTION", action, tabId: tab.id }, () => {
            window.close();
          });
        }
      });
    });
  });

  const menuBtn = document.querySelector('.action-card[data-action="more"]');
  const dropdown = document.getElementById("menu-dropdown");
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = menuBtn.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 4) + "px";
    dropdown.style.right = (document.querySelector(".container").offsetWidth - rect.right) + "px";
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", () => { dropdown.style.display = "none"; });
  dropdown.addEventListener("click", (e) => e.stopPropagation());

  dropdown.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      dropdown.style.display = "none";
      const action = item.dataset.action;
      if (action === "compare") {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab) {
            chrome.runtime.sendMessage({ type: "PERFORM_ACTION", action: "compare", tabId: tab.id }, () => {
              window.close();
            });
          }
        });
      } else if (action === "history") {
        loadCompareHistory();
      }
    });
  });

  loadPageHealth();
});

async function loadPageHealth(forceRefresh = false) {
  const healthBody = document.getElementById("health-body");
  const healthSpinner = document.getElementById("health-spinner");
  if (!healthBody) {
    console.log('No health body present!')
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab) {
      renderHealthError(healthBody, "No active tab");
      return;
    }

    const url = tab.url;
    const isPlayback = isPlaybackPage(url);
    const cdxUrl = isPlayback ? parsePlaybackUrl(url).url : url;

    if (!isPlayback) {
      const avail = await cdx.getAvailability_CDX(url);
      if (avail) {
        const linkUrl = avail.url || `https://web.archive.org/web/${avail.timestamp}/${url}`;
        healthBody.innerHTML = `
          <div class="health-headline">Archived on <strong>${formatDate(avail.timestamp)}</strong></div>
          <div class="health-note">This page has a saved copy. Open it in the Wayback Machine to analyze.</div>
          <a class="health-link" href="${linkUrl}" target="_blank">View archived version →</a>
        `;
      } else {
        healthBody.innerHTML = `<div class="health-empty">⛅ No archived version found for this page</div>`;
      }
      return;
    }

    if (!forceRefresh) {
      const cached = await chrome.storage.local.get([CACHE_PREFIX_HEALTH + cdxUrl]);
      const entry = cached[CACHE_PREFIX_HEALTH + cdxUrl];
      if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        healthSpinner.classList.remove("health-spinner--active");
        renderHealthBody(healthBody, entry.data, cdxUrl, true);
        return;
      }
    }

    healthSpinner.classList.add("health-spinner--active");
    const health = await cdx.getPageHealth("", cdxUrl);
    healthSpinner.classList.remove("health-spinner--active");

    if (health && health.total > 0) {
      await chrome.storage.local.set({
        [CACHE_PREFIX_HEALTH + cdxUrl]: { data: health, timestamp: Date.now() },
      });
    }

    renderHealthBody(healthBody, health, cdxUrl, false);
  });
}

function renderHealthBody(container, health, cdxUrl, fromCache) {
  if (!health || health.total === 0) {
    container.innerHTML = `<div class="health-empty">No snapshot data available</div>`;
    return;
  }

  const truncNote = health.isTruncated
    ? `<div class="health-note">Showing stats for the ${health.total.toLocaleString()} snapshot days (truncated)</div>`
    : "";

  const cacheNote = fromCache
    ? `<div class="health-cache-note">Showing cached results. <span class="health-link health-refresh" data-url="${cdxUrl}">Refresh?</span></div>`
    : "";

  let statusHtml = "";
  if (health.statusDistribution.length > 0) {
    statusHtml = `<div class="health-status-bars">`;
    health.statusDistribution.forEach((s) => {
      statusHtml += `
        <div class="health-bar-row">
          <span class="health-bar-label" style="color:${s.colors.color}">${s.code}</span>
          <div class="health-bar-track">
            <div class="health-bar-fill" style="width:${s.pct}%;background:${s.colors.color}"></div>
          </div>
          <span class="health-bar-count">${s.count}<span class="health-bar-unit">d</span></span>
        </div>
      `;
    });
    statusHtml += `</div>`;
  }

  const timelineLink = health.total > 0
    ? `<div class="health-link health-timeline" data-url="${cdxUrl}">📅 View timeline</div>`
    : "";

  container.innerHTML = `
    <div class="health-stats">
      <div class="health-headline">${health.totalLabel} snapshot day${health.total !== 1 ? "s" : ""}${health.firstArchived ? ` since <strong>${health.firstArchived}</strong>` : ""}</div>
      <div class="health-meta">Last archived: ${health.lastArchived || "Unknown"}</div>
      ${truncNote}
      ${statusHtml}
      ${cacheNote}
      ${timelineLink}
    </div>
    <div class="timeline-container" style="display:none;"></div>
  `;

  const timelineBtn = container.querySelector(".health-timeline");
  if (timelineBtn) {
    timelineBtn.addEventListener("click", () => showTimeline(timelineBtn.dataset.url));
  }

  const refreshLink = container.querySelector(".health-refresh");
  if (refreshLink) {
    refreshLink.addEventListener("click", () => {
      chrome.storage.local.remove(CACHE_PREFIX_HEALTH + refreshLink.dataset.url);
      const spinner = document.getElementById("health-spinner");
      if (spinner) spinner.classList.add("health-spinner--active");
      loadPageHealth(true);
    });
  }
}

function renderHealthError(container, msg) {
  container.innerHTML = `<div class="health-empty">${msg}</div>`;
}


async function showTimeline(cdxUrl) {
  const stats = document.querySelector(".health-stats");
  const container = document.querySelector(".timeline-container");
  const title = document.getElementById("health-card-title");
  if (!stats || !container || !title) return;

  if (container.style.display !== "none") {
    showHistory();
    return;
  }

  if (!cdxUrl) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    cdxUrl = isPlaybackPage(tab.url) ? parsePlaybackUrl(tab.url).url : tab.url;
  }

  stats.style.display = "none";
  title.textContent = "📅 Snapshot Timeline";
  container.style.display = "block";
  container.innerHTML = `<div class="health-loading">Loading timeline...</div>`;

  const cacheKey = CACHE_PREFIX_TIMELINE + cdxUrl;
  const cached = await chrome.storage.local.get([cacheKey]);
  let entry = cached[cacheKey];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    entry.data = normalizeTimelineData(entry.data);
    renderTimeline(container, entry.data, true, cacheKey, cdxUrl);
    return;
  }

  const data = await cdx.getTimelineData("", cdxUrl);
  if (data && data.length > 0) {
    await chrome.storage.local.set({ [cacheKey]: { data, timestamp: Date.now() } });
  }
  renderTimeline(container, data, false, cacheKey, cdxUrl);
}

function normalizeTimelineData(data) {
  if (!data) return data;
  return data.map(({ year, months }) => ({
    year,
    months: months.map(m => {
      if (m === null) return null;
      if (typeof m === "string") return { status: m, ts: null };
      return m;
    })
  }));
}

function renderTimeline(container, data, fromCache, cacheKey, cdxUrl) {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="health-empty">No timeline data available</div>`;
    return;
  }

  let html = `<div class="timeline">`;
  data.forEach(({ year, months }) => {
    const active = months.filter(m => m !== null).length;
    html += `<div class="timeline-row">
      <span class="timeline-year">${year}</span>
      <div class="timeline-cells">`;
    months.forEach((m, mi) => {
      let bg = "#F5F5F5";
      let label = "no data";
      let clickable = false;
      let playUrl = "";
      if (m) {
        const status = typeof m === "string" ? m : m.status;
        const ts = typeof m === "string" ? null : m.ts;
        if (status === "-") { bg = "#E0E0E0"; label = "- (unrecorded)"; }
        else if (status.startsWith("2")) { bg = "#D5F0B3"; label = status; clickable = true; playUrl = ts; }
        else if (status.startsWith("3")) { bg = "#FFE5B3"; label = status; clickable = true; playUrl = ts; }
        else if (status.startsWith("4") || status.startsWith("5")) { bg = "#FFD0D0"; label = status; clickable = true; playUrl = ts; }
      }
      const cls = clickable && playUrl ? "timeline-cell tl-clickable" : "timeline-cell";
      const style = clickable && playUrl ? `background:${bg};cursor:pointer` : `background:${bg}`;
      html += `<span class="${cls}" style="${style}" title="${label}" data-url="${clickable && playUrl ? `https://web.archive.org/web/${playUrl}/${cdxUrl}` : ""}"></span>`;
    });
    html += `</div>
      <span class="timeline-count">${active}m</span>
    </div>`;
  });
  html += `</div>`;

  html += `<div class="timeline-legend">
    <span><span class="tl-dot" style="background:#D5F0B3"></span> 2xx</span>
    <span><span class="tl-dot" style="background:#FFE5B3"></span> 3xx</span>
    <span><span class="tl-dot" style="background:#FFD0D0"></span> 4xx/5xx</span>
    <span><span class="tl-dot" style="background:#E0E0E0"></span> unrecorded</span>
    <span><span class="tl-dot" style="background:#F5F5F5"></span> no data</span>
  </div>
  <div class="health-cache-note" style="margin-top:10px;line-height:1.4;">Each month shows the status of its earliest capture only — later changes within the same month aren't reflected here.</div>`;

  if (fromCache) {
    html += `<div class="health-cache-note" style="margin-top:10px;">Showing cached results. <span class="health-refresh health-link">Refresh?</span></div>`;
  }

  html += `<div class="health-link show-history" style="margin-top:10px;">📋 Show history</div>`;

  container.innerHTML = html;

  container.querySelectorAll(".tl-clickable").forEach(el => {
    el.addEventListener("click", () => {
      const url = el.dataset.url;
      if (url) window.open(url, "_blank");
    });
  });

  const refreshBtn = container.querySelector(".health-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      container.innerHTML = `<div class="health-loading">Loading timeline...</div>`;
      await chrome.storage.local.remove(cacheKey);
      const fresh = await cdx.getTimelineData("", cdxUrl);
      if (fresh && fresh.length > 0) {
        await chrome.storage.local.set({ [cacheKey]: { data: fresh, timestamp: Date.now() } });
      }
      renderTimeline(container, normalizeTimelineData(fresh), false, cacheKey, cdxUrl);
    });
  }

  const showHistoryBtn = container.querySelector(".show-history");
  if (showHistoryBtn) {
    showHistoryBtn.addEventListener("click", showHistory);
  }
}

function showHistory() {
  const stats = document.querySelector(".health-stats");
  const container = document.querySelector(".timeline-container");
  const title = document.getElementById("health-card-title");
  if (!stats || !container || !title) return;

  stats.style.display = "block";
  title.textContent = "Snapshot History";
  container.style.display = "none";
}

async function loadCompareHistory() {
  const card = document.getElementById("history-card");
  const body = document.getElementById("history-body");
  const historyTitle = document.getElementById("history-card-title");
  if (!card || !body) return;

  card.style.display = "block";
  historyTitle.textContent = "Compare History";
  body.innerHTML = `<div class="health-loading">Loading compare history...</div>`;

  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(k => k.startsWith("wbm_compare_"));
  keys.sort((a, b) => (all[b].timestamp || 0) - (all[a].timestamp || 0));

  if (keys.length === 0) {
    body.innerHTML = `<div class="history-empty">No comparisons saved yet.<br>Run a comparison first!</div>`;
    return;
  }

  let html = `<div class="history-list">`;
  for (const key of keys) {
    const entry = all[key];
    const added = entry.stats?.added ?? 0;
    const removed = entry.stats?.removed ?? 0;

    const keyMatch = key.match(/^wbm_compare_(.*)_(\d{14})_(\d{14})$/);
    const url = keyMatch ? keyMatch[1] : key.replace(/^wbm_compare_/, "");
    const tsA = keyMatch ? keyMatch[2] : "";
    const tsB = keyMatch ? keyMatch[3] : "";
    const dateLabelA = formatDate(tsA);
    const dateLabelB = formatDate(tsB);

    html += `
      <div class="history-item" data-key="${escapeHtml(key)}">
        <div class="history-item-content">
          <div class="history-item-url" title="${escapeHtml(url)}">${escapeHtml(url)}</div>
          <div class="history-item-dates">
            <span>${dateLabelB}</span>
            <span>→</span>
            <span>${dateLabelA}</span>
          </div>
          <div class="history-item-stats">
            <span class="history-item-added">+${added}</span>
            <span class="history-item-removed">-${removed}</span>
          </div>
        </div>
        <div class="history-item-overlay">
          <button class="history-view-btn">View</button>
        </div>
      </div>`;
  }
  html += `</div>`;
  body.innerHTML = html;

  body.querySelectorAll(".history-view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".history-item");
      if (item) viewCompare(item.dataset.key, all[item.dataset.key]);
    });
  });
}

function viewCompare(key, entry) {
  const keyMatch = key.match(/^wbm_compare_(.*)_(\d{14})_(\d{14})$/);
  if (!keyMatch) return;
  const url = keyMatch[1];
  const tsA = keyMatch[2];
  const tsB = keyMatch[3];

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, {
      type: "COMPARE_RESULT",
      success: true,
      titleA: entry.titleA || formatDate(tsA),
      titleB: entry.titleB || formatDate(tsB),
      tsA, tsB, url,
      diff: entry.diff || [],
      stats: entry.stats || { added: 0, removed: 0 },
      aiSummary: entry.aiSummary || ""
    });
    window.close();
  });
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

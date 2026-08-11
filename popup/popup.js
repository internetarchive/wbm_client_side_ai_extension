import { getPageHealth, getAvailability } from "../api/cdx.js";

const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "wbm_health_";

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

  loadPageHealth();
});

async function loadPageHealth(forceRefresh = false) {
  const healthBody = document.getElementById("health-body");
  const healthSpinner = document.getElementById("health-spinner");
  if (!healthBody) return;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab) {
      renderHealthError(healthBody, "No active tab");
      return;
    }

    const url = tab.url;
    const isPlayback = isPlaybackPage(url);
    const cdxUrl = isPlayback ? extractOriginalUrl(url) : url;

    if (!isPlayback) {
      const avail = await getAvailability(url);
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
      const cached = await chrome.storage.local.get([CACHE_PREFIX + cdxUrl]);
      const entry = cached[CACHE_PREFIX + cdxUrl];
      if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        healthSpinner.classList.remove("health-spinner--active");
        renderHealthBody(healthBody, entry.data, cdxUrl, true);
        return;
      }
    }

    healthSpinner.classList.add("health-spinner--active");
    const health = await getPageHealth(cdxUrl);
    healthSpinner.classList.remove("health-spinner--active");

    if (health && health.total > 0) {
      await chrome.storage.local.set({
        [CACHE_PREFIX + cdxUrl]: { data: health, timestamp: Date.now() },
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
    ? `<div class="health-note">Showing stats for the latest ${health.total.toLocaleString()} snapshot days (truncated)</div>`
    : "";

  const cacheNote = fromCache
    ? `<div class="health-link health-refresh" data-url="${cdxUrl}">Showing cached results. Want to view the latest?</div>`
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

  container.innerHTML = `
    <div class="health-headline">${health.totalLabel} snapshot day${health.total !== 1 ? "s" : ""}${health.firstArchived ? ` since <strong>${health.firstArchived}</strong>` : ""}</div>
    <div class="health-meta">Last archived: ${health.lastArchived || "Unknown"}</div>
    ${truncNote}
    ${statusHtml}
    ${cacheNote}
  `;

  const refreshLink = container.querySelector(".health-refresh");
  if (refreshLink) {
    refreshLink.addEventListener("click", () => {
      chrome.storage.local.remove(CACHE_PREFIX + refreshLink.dataset.url);
      const spinner = document.getElementById("health-spinner");
      if (spinner) spinner.classList.add("health-spinner--active");
      loadPageHealth(true);
    });
  }
}

function renderHealthError(container, msg) {
  container.innerHTML = `<div class="health-empty">${msg}</div>`;
}

function isPlaybackPage(url) {
  return url && url.startsWith("https://web.archive.org/web/");
}

function extractOriginalUrl(playbackUrl) {
  const match = playbackUrl.match(/^https:\/\/web\.archive\.org\/web\/\d+(?:id_|if_)?\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : playbackUrl;
}

function formatDate(ts) {
  if (!ts || ts.length < 8) return ts;
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

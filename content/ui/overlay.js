let streamContentElement = null;
let streamedText = "";
let _processStepCount = 0;

function showResultOverlay(summary) {
  const shadow = createShadowHost();
  const { popup, content } = createBasePopup("AI Result");
  content.innerHTML = `<p style="padding: 12px 16px; font-size: 13.5px; color: #8e8e93;">${summary}</p>`;
  shadow.appendChild(popup);
  setupMinimizeBehavior(shadow, popup);
}

let screenshotDataUrl = null;

function createStreamingOverlay(action, targetLanguage, showInsights) {
  const shadow = createShadowHost();
  const { popup, content } = createBasePopup(action);

  const hasTabs = targetLanguage && targetLanguage !== "en";
  const langLabel = hasTabs ? getLanguageDisplayName(targetLanguage) : "";
  const summaryLabel = action === "quality" ? "Page Quality" : "Summary";

  let html = "";

  html += `<div class="wbm-tab-bar">`;
  html += `<button class="wbm-tab wbm-tab-active" data-lang="en">${summaryLabel}</button>`;
  if (hasTabs) {
    html += `<button class="wbm-tab wbm-lang-tab" data-lang="${targetLanguage}">${langLabel}</button>`;
    html += `<select class="wbm-lang-select" aria-label="Change language">`;
    LANGUAGES.forEach(l => {
      html += `<option value="${l.code}"${l.code === targetLanguage ? ' selected' : ''}>${l.name}</option>`;
    });
    html += `</select>`;
  }
  html += `<button class="wbm-tab" data-lang="process">Process</button>`;
  html += `</div>`;

  html += `<div class="wbm-tab-panel" data-lang="en">`;
  html +=   `<div class="wbm-accordion" data-type="summary">`;
  html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
  html +=       `<span class="wbm-accordion-icon">▶</span>`;
  html +=       `<span>${summaryLabel}</span>`;
  html +=     `</div>`;
  html +=     `<div class="wbm-accordion-body wbm-accordion-open"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></div>`;
  html +=   `</div>`;

  if (showInsights) {
    html +=   `<div class="wbm-accordion" data-type="insights">`;
    html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
    html +=       `<span class="wbm-accordion-icon">▶</span>`;
    html +=       `<span>Insights</span>`;
    html +=     `</div>`;
    html +=     `<div class="wbm-accordion-body"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></div>`;
    html +=   `</div>`;
  }

  if (action === "quality") {
    html +=   `<div class="wbm-accordion" data-type="screenshot">`;
    html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
    html +=       `<span class="wbm-accordion-icon">▶</span>`;
    html +=       `<span>Screenshot</span>`;
    html +=     `</div>`;
    html +=     `<div class="wbm-accordion-body"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></div>`;
    html +=   `</div>`;
  }

  html += `</div>`;

  if (hasTabs) {
    html += `<div class="wbm-tab-panel" data-lang="${targetLanguage}" style="display:none;">`;
    html +=   `<div class="wbm-accordion" data-type="summary">`;
    html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
    html +=       `<span class="wbm-accordion-icon">▶</span>`;
    html +=       `<span>${summaryLabel}</span>`;
    html +=     `</div>`;
    html +=     `<div class="wbm-accordion-body wbm-accordion-open"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></div>`;
    html +=   `</div>`;
    if (showInsights) {
    html +=   `<div class="wbm-accordion" data-type="insights">`;
    html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
    html +=       `<span class="wbm-accordion-icon">▶</span>`;
    html +=       `<span>Insights</span>`;
    html +=     `</div>`;
    html +=     `<div class="wbm-accordion-body"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></div>`;
    html +=   `</div>`;
    }
    if (action === "quality") {
      html +=   `<div class="wbm-accordion" data-type="screenshot">`;
      html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
      html +=       `<span class="wbm-accordion-icon">▶</span>`;
      html +=       `<span>Screenshot</span>`;
      html +=     `</div>`;
      html +=     `<div class="wbm-accordion-body"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></div>`;
      html +=   `</div>`;
    }
    html += `</div>`;
  }

  html += `<div class="wbm-tab-panel" data-lang="process" style="display:none;">`;
  html +=   `<div class="wbm-process-log">`;
  html +=     `<div class="wbm-process-steps">`;
  html +=       `<div class="wbm-step wbm-step-active">`;
  html +=         `<span class="wbm-step-indicator">→</span>`;
  html +=         `<span class="wbm-step-text">Initiating ${action} analysis...</span>`;
  html +=       `</div>`;
  html +=     `</div>`;
  html +=     `<div class="wbm-process-output" style="display:none;">`;
  html +=       `<div class="wbm-process-output-label">Raw Output</div>`;
  html +=       `<div class="wbm-stream-text"></div>`;
  html +=     `</div>`;
  html +=   `</div>`;
  html += `</div>`;

  content.innerHTML = html;
  shadow.appendChild(popup);

  setupMinimizeBehavior(shadow, popup);

  content.querySelectorAll('.wbm-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const icon = header.querySelector('.wbm-accordion-icon');
      const isOpen = body.classList.contains('wbm-accordion-open');
      body.classList.toggle('wbm-accordion-open');
      icon.textContent = isOpen ? '▶' : '▼';
    });
  });

  const allTabs = content.querySelectorAll('.wbm-tab');
  allTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const lang = tab.dataset.lang;
      allTabs.forEach(t => t.classList.remove('wbm-tab-active'));
      tab.classList.add('wbm-tab-active');
      content.querySelectorAll('.wbm-tab-panel').forEach(p => p.style.display = 'none');
      const panel = content.querySelector(`.wbm-tab-panel[data-lang="${lang}"]`);
      if (panel) panel.style.display = 'block';
      requestAnimationFrame(() => updateTooltipAlignment());
    });
  });

  if (hasTabs) {
    content.querySelector('.wbm-lang-select').addEventListener('change', function() {
      const newLang = this.value;
      const langTab = content.querySelector('.wbm-lang-tab');
      if (langTab) {
        langTab.textContent = getLanguageDisplayName(newLang);
        langTab.dataset.lang = newLang;
        langTab.click();
      }
      if (window.__onLanguageChange) {
        window.__onLanguageChange(newLang);
      }
    });
  }

  const processPanel = content.querySelector('.wbm-tab-panel[data-lang="process"]');
  streamContentElement = processPanel.querySelector('.wbm-stream-text');
  streamedText = "";
  _processStepCount = 0;

  return content;
}

function addProcessStep(text, status) {
  const stepClass = status === "done" ? "wbm-step-done" :
                    status === "error" ? "wbm-step-error" :
                    "wbm-step-active";
  const indicator = status === "done" ? "✓" :
                    status === "error" ? "✗" :
                    "→";

  const stepsContainer = shadowRoot?.querySelector('.wbm-process-steps');
  if (!stepsContainer) return;

  if (_processStepCount > 0) {
    const prev = stepsContainer.querySelector('.wbm-step-active');
    if (prev) {
      prev.className = 'wbm-step wbm-step-done';
      prev.querySelector('.wbm-step-indicator').textContent = '✓';
    }
  }

  stepsContainer.insertAdjacentHTML('beforeend',
    `<div class="wbm-step ${stepClass}">
      <span class="wbm-step-indicator">${indicator}</span>
      <span class="wbm-step-text">${text}</span>
    </div>`
  );
  _processStepCount++;

  const log = shadowRoot?.querySelector('.wbm-process-log');
  if (log) log.scrollTop = log.scrollHeight;
}

function appendQualityTimings(timings) {
  const content = shadowRoot?.getElementById('wbm-ai-content');
  if (!content || !timings) return;

  if (!shadowRoot.querySelector('.wbm-quality-style')) {
    const style = document.createElement('style');
    style.className = 'wbm-quality-style';
    style.textContent = qualityStyle;
    shadowRoot.appendChild(style);
  }

  content.insertAdjacentHTML('beforeend', qualityPopup(timings));
}

function appendStreamChunk(chunk) {
  if (!streamContentElement) return;
  if (streamedText.length === 0) {
    const output = shadowRoot?.querySelector('.wbm-process-output');
    if (output) output.style.display = 'block';
    addProcessStep("Receiving AI response stream...", "active");
  }

  else {
    content.innerHTML = result;
  }

  streamContentElement.append(chunk);
  const log = shadowRoot?.querySelector('.wbm-process-log');
  if (log) log.scrollTop = log.scrollHeight;
}

function populateTab(tabLang, summaryHtml) {
  const panel = shadowRoot?.querySelector(`.wbm-tab-panel[data-lang="${tabLang}"]`);
  if (!panel) return;

  const summaryBody = panel.querySelector('.wbm-accordion[data-type="summary"] .wbm-accordion-body');
  if (summaryBody) {
    const loading = summaryBody.querySelector('.wbm-loading-container');
    if (loading) loading.remove();
    summaryBody.innerHTML = summaryHtml;
  }
}



let streamContentElement = null;
let streamedText = "";

function createStreamingOverlay(action = "AI Response") {
  const shadow = createShadowHost();

  const popup = document.createElement("div");
  popup.id = "wbm-ai-popup";

  const header = document.createElement("div");
  header.id = "wbm-ai-header";
  header.textContent = action;

  const closeButton = document.createElement("button");
  closeButton.id = "wbm-ai-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.onclick = () => removeDiv();

  const content = document.createElement("div");
  content.id = "wbm-ai-content";

  content.textContent = "Thinking...";

  header.appendChild(closeButton);
  popup.appendChild(header);
  popup.appendChild(content);

  shadow.appendChild(popup);

  streamContentElement = content;
  streamedText = "";

  return content;
}


function appendStreamChunk(chunk) {
  if (!streamContentElement) return;

  if (insights.famousPeople?.length) {
    if (!insights.faqs?.length) html += '<div class="wbm-insights-section">';
    html += '<div class="wbm-insights-title">Famous Personalities</div>';
    html += '<div class="wbm-famous-list">';
    insights.famousPeople.forEach((person, i) => {
      const originalPerson = insights.famousPeopleOriginal?.[i];
      const wikiName = originalPerson?.name || person.name;
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiName.replace(/ /g, '_'))}`;
      const name = escapeHtml(person.name);
      const desc = escapeHtml(person.description);
      html += `<div class="wbm-famous-wrapper">
        <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="wbm-famous-chip">${name}</a>
        <div class="wbm-famous-tooltip">${desc}</div>
      </div>`;
    });
    html += '</div></div>';
  }

  insightsBody.insertAdjacentHTML('beforeend', html);

  insightsBody.querySelectorAll('.wbm-faq-question').forEach(el => {
    const toggle = () => {
      const answer = el.nextElementSibling;
      const icon = el.querySelector('.wbm-faq-icon');
      const isOpen = answer.classList.contains('wbm-faq-open');
      answer.classList.toggle('wbm-faq-open');
      icon.textContent = isOpen ? '+' : '\u2212';
      icon.classList.toggle('wbm-faq-icon-open');
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  requestAnimationFrame(() => updateTooltipAlignment());
}

function updateTooltipAlignment() {
  shadowRoot?.querySelectorAll('.wbm-famous-wrapper').forEach(wrapper => {
    const rect = wrapper.getBoundingClientRect();
    const tooltipWidth = 220;
    const spaceOnRight = window.innerWidth - rect.left;
    wrapper.classList.toggle('wbm-align-right', spaceOnRight < tooltipWidth + 24);
  });
}

function setScreenshot(dataUrl) {
  screenshotDataUrl = dataUrl;
  const content = shadowRoot?.getElementById('wbm-ai-content');
  if (!content || !dataUrl) return;

  const panels = content.querySelectorAll('.wbm-tab-panel');
  panels.forEach(panel => {
    const body = panel.querySelector('.wbm-accordion[data-type="screenshot"] .wbm-accordion-body');
    if (!body) return;
    const loading = body.querySelector('.wbm-loading-container');
    if (loading) loading.remove();
    body.innerHTML = `<img src="${dataUrl}" style="width:100%;border-radius:8px;display:block;border:1px solid #e0e0e0;" alt="Page screenshot">`;
  });
}

const LANGUAGES = [
  { code: "hi", name: "हिन्दी" },
  { code: "bn", name: "বাংলা" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
  { code: "ko", name: "한국어" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "tr", name: "Türkçe" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" }
];

function getLanguageDisplayName(lang) {
  const found = LANGUAGES.find(l => l.code === lang);
  return found ? found.name : lang;
}

function formatCompareDate(ts) {
  if (!ts || ts.length < 8) return ts;
  const y = ts.substring(0, 4), m = ts.substring(4, 6), d = ts.substring(6, 8);
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function showCompareOverlay(data) {
  const shadow = createShadowHost();

  const style = document.createElement('style');
  style.textContent = compareStyle;
  shadow.appendChild(style);

  const { popup, content } = createBasePopup("Snapshot Comparison");
  shadow.appendChild(popup);

  if (!data.success) {
    const isLoading = data.error === "Comparing snapshots...";
    content.innerHTML = isLoading
      ? `<div class="cmp-section" style="text-align:center;padding:24px 18px;"><div class="wbm-spinner" style="margin:0 auto;"></div><p style="margin-top:12px;color:#666;font-size:13px;">${escapeHtml(data.error)}</p></div>`
      : `<div class="cmp-section" style="padding:24px 18px;"><p style="color:#D0021B;font-size:14px;">${escapeHtml(data.error)}</p></div>`;
    setupMinimizeBehavior(shadow, popup);
    return;
  }

  const dateA = formatCompareDate(data.tsA);
  const dateB = formatCompareDate(data.tsB);
  const added = data.stats?.added ?? 0;
  const removed = data.stats?.removed ?? 0;
  const diff = Array.isArray(data.diff) ? data.diff : [];

  let html = "";

  html += `<div class="cmp-header">
    <div class="cmp-versions">
      <div class="cmp-version"><span class="cmp-date">${dateB}</span><span class="cmp-label">Earliest</span></div>
      <span class="cmp-vs">vs</span>
      <div class="cmp-version cmp-current"><span class="cmp-date">${dateA}</span><span class="cmp-label">Current</span></div>
    </div>
    <div class="cmp-stats">
      <span class="cmp-stat cmp-added">+${added} words</span>
      <span class="cmp-stat cmp-removed">-${removed} words</span>
    </div>
  </div>`;

  if (data.aiSummary) {
    html += `<div class="cmp-section">
      <div class="cmp-section-title">AI Summary</div>
      <div class="cmp-ai-summary">${marked.parse(data.aiSummary)}</div>
    </div>`;
  }

  let diffHtml = "";
  const displayDiff = diff.length > 200 ? diff.slice(0, 200) : diff;
  for (const part of displayDiff) {
    if (part.type === "added") {
      diffHtml += `<div class="cmp-line cmp-added"><span class="cmp-sign">+</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "removed") {
      diffHtml += `<div class="cmp-line cmp-removed"><span class="cmp-sign">-</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "unchanged") {
      diffHtml += `<div class="cmp-line cmp-unchanged"><span class="cmp-sign"> </span>${escapeHtml(part.value)}</div>`;
    }
  }

  let fullDiffHtml = "";
  for (const part of diff) {
    if (part.type === "added") {
      fullDiffHtml += `<div class="cmp-line cmp-added"><span class="cmp-sign">+</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "removed") {
      fullDiffHtml += `<div class="cmp-line cmp-removed"><span class="cmp-sign">-</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "unchanged") {
      fullDiffHtml += `<div class="cmp-line cmp-unchanged"><span class="cmp-sign"> </span>${escapeHtml(part.value)}</div>`;
    }
  }

  html += `<div class="cmp-section">
    <div class="cmp-section-title">Changes${diff.length > 200 ? ` (showing first 200 of ${diff.length} parts)` : ""} <span class="cmp-expand-btn cmp-diff-expand">⛶</span></div>
    <div class="cmp-diff">${diffHtml}</div>
  </div>`;

  html += `<div class="cmp-section">
    <div class="cmp-section-title">Visual Preview</div>
    <div class="cmp-frames">
      <div class="cmp-frame" data-url="${data.tsB}">
        <div class="cmp-frame-label">${dateB} <span class="cmp-expand-btn" data-ts="${data.tsB}" data-url="${data.url}" data-label="${dateB}">⛶</span></div>
        <iframe src="https://web.archive.org/web/${data.tsB}if_/${data.url}" sandbox="allow-same-origin" loading="lazy"></iframe>
      </div>
      <div class="cmp-frame" data-url="${data.tsA}">
        <div class="cmp-frame-label">${dateA} <span class="cmp-expand-btn" data-ts="${data.tsA}" data-url="${data.url}" data-label="${dateA}">⛶</span></div>
        <iframe src="https://web.archive.org/web/${data.tsA}if_/${data.url}" sandbox="allow-same-origin" loading="lazy"></iframe>
      </div>
    </div>
  </div>`;

  content.innerHTML = html;

  content.querySelectorAll(".cmp-expand-btn").forEach(btn => {
    if (btn.classList.contains("cmp-diff-expand")) {
      btn.addEventListener("click", () => showCompareDiffModal(shadow, fullDiffHtml, `Changes (${added} added, ${removed} removed)`));
    } else {
      btn.addEventListener("click", () => {
        showCompareFrameModal(shadow, btn.dataset.ts, btn.dataset.url, btn.dataset.label);
      });
    }
  });

  setupMinimizeBehavior(shadow, popup);
}

function showCompareFrameModal(shadow, ts, url, label) {
  const existing = shadow.getElementById("cmp-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "cmp-modal";

  const frame = document.createElement("iframe");
  frame.src = `https://web.archive.org/web/${ts}if_/${url}`;
  frame.sandbox = "allow-same-origin";

  const closeBtn = document.createElement("span");
  closeBtn.className = "cmp-modal-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  const header = document.createElement("div");
  header.className = "cmp-modal-header";
  header.textContent = label;

  modal.appendChild(header);
  modal.appendChild(frame);
  modal.appendChild(closeBtn);
  shadow.appendChild(modal);
}

function showCompareDiffModal(shadow, diffHtml, label) {
  const existing = shadow.getElementById("cmp-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "cmp-modal";
  modal.className = "cmp-modal-diff";

  const closeBtn = document.createElement("span");
  closeBtn.className = "cmp-modal-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  const header = document.createElement("div");
  header.className = "cmp-modal-header";
  header.textContent = label;

  const body = document.createElement("div");
  body.className = "cmp-diff-modal-body";
  body.innerHTML = diffHtml;

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(closeBtn);
  shadow.appendChild(modal);
}

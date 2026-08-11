let streamContentElement = null;
let streamedText = "";

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

  let html = "";

  if (hasTabs) {
    html += `<div class="wbm-tab-bar">`;
    html += `<button class="wbm-tab wbm-tab-active" data-lang="en">English</button>`;
    html += `<button class="wbm-tab" data-lang="${targetLanguage}">${langLabel}</button>`;
    html += `</div>`;
  }

  html += `<div class="wbm-tab-panel" data-lang="en">`;
  html +=   `<div class="wbm-accordion" data-type="summary">`;
  html +=     `<div class="wbm-accordion-header" role="button" tabindex="0">`;
  html +=       `<span class="wbm-accordion-icon">▶</span>`;
  html +=       `<span>View Streaming</span>`;
  html +=     `</div>`;
  html +=     `<div class="wbm-accordion-body wbm-accordion-open"><span class="wbm-streaming-text"><div class="wbm-loading-container"><div class="wbm-spinner"></div></div></span></div>`;
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
    html +=       `<span>View Streaming</span>`;
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

  if (hasTabs) {
    content.querySelectorAll('.wbm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const lang = tab.dataset.lang;
        content.querySelectorAll('.wbm-tab').forEach(t => t.classList.remove('wbm-tab-active'));
        tab.classList.add('wbm-tab-active');
        content.querySelectorAll('.wbm-tab-panel').forEach(p => p.style.display = 'none');
        const panel = content.querySelector(`.wbm-tab-panel[data-lang="${lang}"]`);
        if (panel) panel.style.display = 'block';
      });
    });
  }

  const enPanel = content.querySelector('.wbm-tab-panel[data-lang="en"]');
  streamContentElement = enPanel.querySelector('.wbm-accordion[data-type="summary"] .wbm-streaming-text');
  streamedText = "";

  return content;
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
    streamContentElement.innerHTML = "";
  }

  else {
    content.innerHTML = result;
  }

  streamContentElement.append(chunk);
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

  if (streamedText.length === 0) {
    streamContentElement.textContent = "";
  }

  streamedText += chunk;

  // Google recommended approach
  streamContentElement.append(chunk);

  streamContentElement.scrollTop =
    streamContentElement.scrollHeight;
}


function finishStream() {
  if (!streamContentElement) return;

  const html = marked.parse(streamedText);

  streamContentElement.innerHTML = html;
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

function getLanguageDisplayName(lang) {
  const names = {
    "hi": "हिन्दी",
    "bn": "বাংলা",
    "es": "Español",
    "fr": "Français",
    "de": "Deutsch",
    "ja": "日本語",
    "zh": "中文",
    "ko": "한국어",
    "pt": "Português",
    "ru": "Русский",
    "ar": "العربية",
    "it": "Italiano",
    "nl": "Nederlands",
    "tr": "Türkçe",
    "vi": "Tiếng Việt",
    "th": "ไทย"
  };
  return names[lang] || lang;
}

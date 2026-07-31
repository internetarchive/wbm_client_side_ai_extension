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
  html += `<button class="wbm-tab" data-lang="process">Logs</button>`;
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

  html += `
  <div class="cmp-section cmp-chat-section" style="margin-top: 10px">
    <div class="cmp-chat-messages" id="cmp-chat-messages"></div>
    <div class="cmp-chat-input-row">
      <input type="text" class="cmp-chat-input" id="cmp-chat-input" placeholder="Ask about this page...">
      <button class="cmp-chat-send-btn" id="cmp-chat-send-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>`;

  content.innerHTML = html;
  shadow.appendChild(popup);

  const chatStyle = document.createElement('style');
  chatStyle.textContent = cmpChatStyle;
  shadow.appendChild(chatStyle);

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

  const chatInput = content.querySelector("#cmp-chat-input");
  const chatSend = content.querySelector("#cmp-chat-send-btn");
  if (chatInput && chatSend) {
    const sendMsg = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      appendChatMessage(content, "user", text);
      chatInput.value = "";
      const msgEl = appendChatMessage(content, "ai", "Logic coming soon...");
      setTimeout(() => { msgEl.textContent = "Chat for summary will be implemented next."; }, 600);
    };
    chatSend.addEventListener("click", sendMsg);
    chatInput.addEventListener("keydown", e => { if (e.key === "Enter") sendMsg(); });
  }

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
  streamedText += chunk;
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function appendInsights(tabLang, insights) {
  const panel = shadowRoot?.querySelector(`.wbm-tab-panel[data-lang="${tabLang}"]`);
  if (!panel) return;

  const insightsBody = panel.querySelector('.wbm-accordion[data-type="insights"] .wbm-accordion-body');
  if (!insightsBody) return;

  const loading = insightsBody.querySelector('.wbm-loading-container');
  if (loading) loading.remove();

  if (!insights) return;

  let html = '<div class="wbm-divider"></div>';

  if (insights.faqs?.length) {
    html += '<div class="wbm-insights-section">';
    html += '<div class="wbm-insights-title">Interesting Questions</div>';
    html += '<div class="wbm-faq-list">';
    insights.faqs.forEach(faq => {
      const answerHtml = marked.parse(faq.answer);
      html += '<div class="wbm-faq-item">';
      html += '<div class="wbm-faq-question" role="button" tabindex="0">';
      html += `<span>${escapeHtml(faq.question)}</span>`;
      html += '<span class="wbm-faq-icon">+</span>';
      html += '</div>';
      html += `<div class="wbm-faq-answer">${answerHtml}</div>`;
      html += '</div>';
    });
    html += '</div></div>';
  }

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
  if (!ts) return "";
  if (ts === "live") return "Live";
  if (ts.length < 8) return ts;
  const y = ts.substring(0, 4), m = ts.substring(4, 6), d = ts.substring(6, 8);
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

let _compareLoadingRef = null;
let _currentSnapshotRef = null;
let _currentCompareCtx = null;
let _pendingStreamMsgs = {};

function restoreSendBtn(chatSend, chatInput) {
  if (!chatSend) return;
  chatSend._streaming = false;
  chatSend._msgId = null;
  chatSend.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>`;
  chatSend.className = "cmp-chat-send-btn";
  chatSend.disabled = false;
  if (chatInput) { chatInput.disabled = false; chatInput.focus(); }
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "CHAT_STREAM_CHUNK" || request.type === "CHAT_STREAM_END" || request.type === "CHAT_STREAM_ERROR") {
    const pending = _pendingStreamMsgs[request.messageId];
    if (!pending) return false;

    if (request.type === "CHAT_STREAM_CHUNK") {
      pending.fullText += request.chunk;
      pending.el.textContent = pending.fullText;
    } else if (request.type === "CHAT_STREAM_END") {
      if (!pending.fullText) pending.el.textContent = "Response stopped.";
      restoreSendBtn(pending.chatSend, pending.chatInput);
      delete _pendingStreamMsgs[request.messageId];
    } else {
      pending.el.textContent = "Error: " + (request.error || "Unknown error");
      restoreSendBtn(pending.chatSend, pending.chatInput);
      delete _pendingStreamMsgs[request.messageId];
    }
    return false;
  }
  return false;
});

function showCompareLoading(msg) {
  if (_compareLoadingRef) return;
  const shadow = createShadowHost();
  const style = document.createElement('style');
  style.textContent = compareStyle;
  shadow.appendChild(style);
  const { popup, content } = createBasePopup("Snapshot Comparison");
  shadow.appendChild(popup);
  setupMinimizeBehavior(shadow, popup);
  content.innerHTML = `
    <div class="wbm-process-log" style="border:none;min-height:80px;max-height:none;">
      <div class="wbm-process-steps">
        <div class="wbm-step wbm-step-active">
          <span class="wbm-step-indicator">→</span>
          <span class="wbm-step-text">${escapeHtml(msg)}</span>
        </div>
      </div>
    </div>`;
  _compareLoadingRef = { shadow, popup, content };
}

function appendCompareStep(step, status) {
  if (!_compareLoadingRef) return;
  const stepsContainer = _compareLoadingRef.content.querySelector('.wbm-process-steps');
  if (!stepsContainer) return;

  const prev = stepsContainer.querySelector('.wbm-step-active');
  if (prev) {
    prev.className = 'wbm-step wbm-step-done';
    prev.querySelector('.wbm-step-indicator').textContent = '✓';
  }

  const stepClass = status === "done" ? "wbm-step-done" :
                    status === "error" ? "wbm-step-error" :
                    "wbm-step-active";
  const indicator = status === "done" ? "✓" :
                    status === "error" ? "✗" :
                    "→";

  stepsContainer.insertAdjacentHTML('beforeend',
    `<div class="wbm-step ${stepClass}">
      <span class="wbm-step-indicator">${indicator}</span>
      <span class="wbm-step-text">${escapeHtml(step)}</span>
    </div>`
  );
}

function showCompareInput(data) {
  _currentSnapshotRef = { ts: data.ts, url: data.url };
  if (typeof _compareLoadingRef !== 'undefined' && _compareLoadingRef) {
    _compareLoadingRef = null;
  }

  const shadow = createShadowHost();
  const style = document.createElement('style');
  style.textContent = compareStyle; 
  shadow.appendChild(style);
  
  const { popup, content } = createBasePopup("Snapshot Comparison");
  shadow.appendChild(popup);
  setupMinimizeBehavior(shadow, popup);

  const demos = [
    "How did this page look exactly a year ago?",
    "Compare the current snapshot with the very first capture",
    "Show me the differences between 2010 and 2015",
    "What changed between last Tuesday and today?"
  ];

  const ts = data.ts || "";
  const displayDate = ts.length >= 8
    ? `${ts.substring(0, 4)}-${ts.substring(4, 6)}-${ts.substring(6, 8)}`
    : "";

  content.innerHTML = `
    <div class="cmp-section">
      <div style="margin-bottom:16px;">
        <div class="cmp-header-label">Current Snapshot</div>
        <div class="cmp-header-value">${escapeHtml(displayDate || data.url || "")}</div>
      </div>
      <p class="cmp-prompt-text">
        Tell me what to compare in plain English:
      </p>
      <div class="cmp-input-group">
        <div class="cmp-input-wrap">
          <input type="text" id="cmp-nl-input" class="cmp-nl-input" autocomplete="off">
          <div class="cmp-nl-placeholder" id="cmp-nl-placeholder">
            ${demos.map((d, i) => `
              <span class="cmp-nl-ph-text ${i === 0 ? 'active' : ''}">${escapeHtml(d)}</span>
            `).join('')}
          </div>
        </div>
        <button id="cmp-submit-btn" class="cmp-submit-btn" aria-label="Submit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `;

  const phSpans = content.querySelectorAll('.cmp-nl-ph-text');
  let phIndex = 0;
  
  const phTimer = setInterval(() => {
    const prev = phSpans[phIndex];
    prev.classList.remove('active');
    prev.classList.add('exit'); 

    phIndex = (phIndex + 1) % phSpans.length;
    const next = phSpans[phIndex];
    next.classList.remove('exit');
    setTimeout(() => next.classList.add('active'), 20); 
  }, 3500);

  const input = content.querySelector('#cmp-nl-input');
  const phContainer = content.querySelector('#cmp-nl-placeholder');

  function togglePh() {
    const shadowRoot = input.getRootNode(); 
  
    if (shadowRoot.activeElement === input || input.value.trim().length > 0) {
      phContainer.style.opacity = '0';
    } else {
      phContainer.style.opacity = '1';
    }
  }
  
  input.addEventListener('focus', togglePh);
  input.addEventListener('blur', togglePh);
  input.addEventListener('input', togglePh);
  togglePh();

  const submitBtn = content.querySelector('#cmp-submit-btn');

  function submit() {
    const text = input.value.trim();
    if (!text) return;
    clearInterval(phTimer);
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
      </svg>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;

    content.querySelector('.cmp-section').innerHTML = `
      <div class="wbm-process-log" style="border:none;min-height:60px;max-height:none;padding:24px;">
        <div class="wbm-process-steps">
          <div class="wbm-step wbm-step-active">
            <span class="wbm-step-indicator" style="color:#007aff;">→</span>
            <span class="wbm-step-text" style="font-size:14px;color:#333;">Parsing your request...</span>
          </div>
        </div>
      </div>`;
      
    chrome.runtime.sendMessage({
      type: "COMPARE_PARSE_INPUT",
      text,
      ts: _currentSnapshotRef?.ts || "",
      url: _currentSnapshotRef?.url || ""
    });
  }

  submitBtn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

function showCompareOverlay(data) {
  if (!data.success) {
    if (_compareLoadingRef) {
      _compareLoadingRef.content.innerHTML =
        `<div class="cmp-section" style="padding:24px 18px;"><p style="color:#D0021B;font-size:14px;">${escapeHtml(data.error)}</p></div>`;
      _compareLoadingRef = null;
    } else {
      const shadow = createShadowHost();
      const style = document.createElement('style');
      style.textContent = compareStyle;
      shadow.appendChild(style);
      const { popup, content } = createBasePopup("Snapshot Comparison");
      shadow.appendChild(popup);
      content.innerHTML = `<div class="cmp-section" style="padding:24px 18px;"><p style="color:#D0021B;font-size:14px;">${escapeHtml(data.error)}</p></div>`;
      setupMinimizeBehavior(shadow, popup);
    }
    return;
  }

  const shadow = _compareLoadingRef ? _compareLoadingRef.shadow : createShadowHost();
  const popup = _compareLoadingRef ? _compareLoadingRef.popup : null;
  const content = _compareLoadingRef ? _compareLoadingRef.content : null;
  _compareLoadingRef = null;

  const dateA = formatCompareDate(data.tsA);
  const dateB = formatCompareDate(data.tsB);
  const added = data.stats?.added ?? 0;
  const removed = data.stats?.removed ?? 0;
  const diff = Array.isArray(data.diff) ? data.diff : [];

  chrome.runtime.sendMessage({ type: "CHAT_RESET" });

  _currentCompareCtx = {
    titleA: data.titleA || "",
    titleB: data.titleB || "",
    tsA: data.tsA,
    tsB: data.tsB,
    url: data.url,
    added,
    removed,
    aiSummary: data.aiSummary || "",
    diffPreview: diff.filter(p => p.type !== "unchanged").slice(0, 80).map(p => `${p.type === "added" ? "+" : "-"} ${p.value}`).join("\n").slice(0, 3000)
  };

  let html = "";

  const showBack = typeof _currentSnapshotRef !== 'undefined' && _currentSnapshotRef;

  html += `
  <div class="cmp-header" style="position: relative; display: flex; flex-direction: column; align-items: center; padding: 16px 18px;">
    
    ${showBack ? `<button class="cmp-back-btn" title="New comparison" aria-label="Go back" style="position: absolute; left: 16px; top: 16px; background: transparent; border: none; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background 0.2s, color 0.2s;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </button>` : ""}

    <div class="cmp-versions">
      <div class="cmp-version"><span class="cmp-date">${dateB}</span></div>
      <span class="cmp-vs">vs</span>
      <div class="cmp-version cmp-current"><span class="cmp-date">${dateA}</span></div>
    </div>
    
    <div class="cmp-stats">
      <span class="cmp-stat cmp-added">+${added} words</span>
      <span class="cmp-stat cmp-removed">-${removed} words</span>
    </div>
    
  </div>
`;

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
        <div class="cmp-frame-label">${dateB}${data.tsB !== "live" ? ` <span class="cmp-expand-btn" data-ts="${data.tsB}" data-url="${data.url}" data-label="${dateB}">⛶</span>` : ""}</div>
        <div class="cmp-frame-thumb">
          ${data.tsB !== "live"
            ? `<iframe src="https://web.archive.org/web/${data.tsB}if_/${data.url}" sandbox="allow-same-origin" loading="lazy"></iframe>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;font-size:12px;font-weight:600;">Currently Live</div>`}
        </div>
      </div>
      <div class="cmp-frame" data-url="${data.tsA}">
        <div class="cmp-frame-label">${dateA}${data.tsA !== "live" ? ` <span class="cmp-expand-btn" data-ts="${data.tsA}" data-url="${data.url}" data-label="${dateA}">⛶</span>` : ""}</div>
        <div class="cmp-frame-thumb">
          ${data.tsA !== "live"
            ? `<iframe src="https://web.archive.org/web/${data.tsA}if_/${data.url}" sandbox="allow-same-origin" loading="lazy"></iframe>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;font-size:12px;font-weight:600;">Currently Live</div>`}
        </div>
      </div>
    </div>
  </div>`;

  html += `
  <div class="cmp-section cmp-chat-section">
    <div class="cmp-chat-messages" id="cmp-chat-messages"></div>
    <div class="cmp-chat-input-row">
      <input type="text" class="cmp-chat-input" id="cmp-chat-input" placeholder="Ask about these changes...">
      <button class="cmp-chat-send-btn" id="cmp-chat-send-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>`;

  let popupData;
  if (!popup) {
    const style = document.createElement('style');
    style.textContent = compareStyle + cmpChatStyle;
    shadow.appendChild(style);
    popupData = createBasePopup("Snapshot Comparison");
    shadow.appendChild(popupData.popup);
    setupMinimizeBehavior(shadow, popupData.popup);
    popupData.content.innerHTML = html;
    popupData.content.querySelectorAll(".cmp-expand-btn").forEach(btn => {
      if (btn.classList.contains("cmp-diff-expand")) {
        btn.addEventListener("click", () => showCompareDiffModal(shadow, fullDiffHtml, `Changes (${added} added, ${removed} removed)`));
      } else {
        btn.addEventListener("click", () => showCompareFrameModal(shadow, btn.dataset.ts, btn.dataset.url, btn.dataset.label));
      }
    });
    const backBtn = popupData.content.querySelector(".cmp-back-btn");
    if (backBtn) backBtn.addEventListener("click", () => _currentSnapshotRef && showCompareInput(_currentSnapshotRef));
  } else {
    const existingStyle = shadow.querySelector("style");
    if (existingStyle && !existingStyle.textContent.includes("cmp-chat-section")) {
      existingStyle.textContent += "\n" + cmpChatStyle;
    }
    content.innerHTML = html;
    content.querySelectorAll(".cmp-expand-btn").forEach(btn => {
      if (btn.classList.contains("cmp-diff-expand")) {
        btn.addEventListener("click", () => showCompareDiffModal(shadow, fullDiffHtml, `Changes (${added} added, ${removed} removed)`));
      } else {
        btn.addEventListener("click", () => showCompareFrameModal(shadow, btn.dataset.ts, btn.dataset.url, btn.dataset.label));
      }
    });
    const backBtn = content.querySelector(".cmp-back-btn");
    if (backBtn) backBtn.addEventListener("click", () => _currentSnapshotRef && showCompareInput(_currentSnapshotRef));
  }

  const chatContainer = popup ? content : popupData.content;
  const chatInput = chatContainer.querySelector("#cmp-chat-input");
  const chatSend = chatContainer.querySelector("#cmp-chat-send-btn");
  if (chatInput && chatSend) {
    const chatKey = `wbm_chat_${data.url}_${data.tsB}_${data.tsA}`;
    chrome.storage.local.get([chatKey], result => {
      const stored = result[chatKey];
      if (stored && stored.initialPrompts) {
        const messagesEl = chatContainer.querySelector("#cmp-chat-messages");
        if (messagesEl) messagesEl.innerHTML = "";
        for (const entry of stored.initialPrompts) {
          if (entry.role === "user" || entry.role === "assistant") {
            appendChatMessage(chatContainer, entry.role === "user" ? "user" : "ai", entry.content);
          }
        }
      }
    });
    const sendMsg = () => {
      if (chatSend._streaming) {
        chrome.runtime.sendMessage({ type: "CHAT_STOP", messageId: chatSend._msgId });
        return;
      }
      const text = chatInput.value.trim();
      if (!text) return;
      appendChatMessage(chatContainer, "user", text);
      chatInput.value = "";
      const msgEl = appendChatMessage(chatContainer, "ai", "");
      const msgId = "cmp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      chatSend._streaming = true;
      chatSend._msgId = msgId;
      chatSend.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>`;
      chatSend.className = "cmp-chat-send-btn cmp-chat-stop-btn";
      _pendingStreamMsgs[msgId] = { el: msgEl, chatInput, chatSend, fullText: "" };
      chatInput.disabled = true;
      chrome.runtime.sendMessage(
        { type: "CHAT_QUESTION_START", context: _currentCompareCtx, question: text, messageId: msgId }
      );
    };
    chatSend.addEventListener("click", sendMsg);
    chatInput.addEventListener("keydown", e => { if (e.key === "Enter") sendMsg(); });
  }
}

function appendChatMessage(container, role, text) {
  const messages = container.querySelector("#cmp-chat-messages");
  if (!messages) return null;
  const msg = document.createElement("div");
  msg.className = `cmp-chat-msg cmp-chat-msg-${role}`;
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
  return msg;
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

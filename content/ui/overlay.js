let streamContentElement = null;
let streamedText = "";

function showResultOverlay(summary) {
  const shadow = createShadowHost();
  const { popup, content } = createBasePopup("AI Result");
  content.innerHTML = `<p style="padding: 12px 16px; font-size: 13.5px; color: #8e8e93;">${summary}</p>`;
  shadow.appendChild(popup);
  setupMinimizeBehavior(shadow, popup);
}

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
  streamedText += chunk;
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
    insights.famousPeople.forEach(person => {
      html += `<span class="wbm-famous-chip">${escapeHtml(person)}</span>`;
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

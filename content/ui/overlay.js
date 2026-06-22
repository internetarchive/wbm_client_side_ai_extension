let currentContentElement = null;

function showOverlay(action, result, timings) {
  const shadow = createShadowHost();

  const { popup, content } = createBasePopup(action);

  if(action === "quality") {
    const timingHTML = qualityPopup(timings, result);
    content.innerHTML = timingHTML;
    const extraStyle = document.createElement('style');
    extraStyle.textContent = qualityStyle;
    shadow.appendChild(extraStyle);
  }

  else if(action === "summarize") {
    content.innerHTML = marked.parse(result);
  }

  else {
    content.innerHTML = result;
  }

  shadow.appendChild(popup);
  currentContentElement = content;
}



let streamContentElement = null;
let streamedText = "";

function createStreamingOverlay(action = "AI Response") {
  const shadow = createShadowHost();

  const { popup, content } = createBasePopup(action);
  

  content.innerHTML = `
  <span style="margin-right: 8px;">Thinking</span>
  <span class="thinking-dots" style="display:inline-flex;">
    <span></span><span></span><span></span>
  </span>
`;

  shadow.appendChild(popup);

  streamContentElement = content;
  streamedText = "";

  return content;
}


function showStreamingLoading() {
  if (!streamContentElement) return;

  const popup = streamContentElement.closest('#wbm-ai-popup');
  if (!popup) return;

  streamContentElement.classList.add('wbm-loading-blur');

  const overlay = document.createElement('div');
  overlay.className = 'wbm-loading-overlay';
  overlay.innerHTML = '<div class="wbm-spinner"></div>';
  popup.appendChild(overlay);
}

function appendStreamChunk(chunk) {
  if (!streamContentElement) return;

  if (streamedText.length === 0) {
    streamContentElement.textContent = "";
  }

  streamedText += chunk;

  streamContentElement.append(chunk);

  streamContentElement.scrollTop =
    streamContentElement.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function appendInsights(element, insights) {
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

  element.insertAdjacentHTML('beforeend', html);

  element.querySelectorAll('.wbm-faq-question').forEach(el => {
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

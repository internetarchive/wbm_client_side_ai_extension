let _originalSummary = "";
let _originalInsights = null;
let _currentAction = "";
let _pendingInsightsLang = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request.action;
  if(request.type === "REQUEST_CONTENT") {
    const result = analyzePage(sendResponse);
    return true;
  }

  else if (request.type === "SHOW_RESULT") {
    showResultOverlay(request.summary);
  }

  else if (request.type === "STREAM_START") {
    createStreamingOverlay(request.action);
  }

  else if (request.type === "STREAM_CHUNK") {
    appendStreamChunk(request.chunk);
  }

  else if (request.type === "STREAM_END") {
    finishStream();
  }

  else if (request.type === "STREAM_ERROR") {
    if (streamContentElement) {
      streamContentElement.textContent = `Error: ${request.error}`;
    }
  }

  else if (request.type === "TRANSLATED_RESULT") {
    _originalSummary = request.originalSummary || request.summary;
    const hasTabs = shadowRoot?.querySelector('.wbm-tab-bar');
    if (hasTabs) {
      populateTab("en", marked.parse(request.originalSummary || request.summary));
      populateTab(request.targetLanguage, marked.parse(request.summary));
    } else {
      const summaryBody = shadowRoot?.querySelector('.wbm-accordion[data-type="summary"] .wbm-accordion-body');
      if (summaryBody) {
        const loading = summaryBody.querySelector('.wbm-loading-container');
        if (loading) loading.remove();
        summaryBody.innerHTML = marked.parse(request.summary);
      }
    }
    if (request.action === "quality" && request.timings) {
      appendQualityTimings(request.timings);
    }
    if (request.screenshot) {
      setScreenshot(request.screenshot);
    }
  }

  else if (request.type === "STRUCTURED_INSIGHTS") {
    _originalInsights = request.insights;
    if (request.translatedInsights) {
      appendInsights("en", request.insights);
      appendInsights(request.targetLanguage, request.translatedInsights);
    } else {
      const hasTabs = shadowRoot?.querySelector('.wbm-tab-bar');
      if (hasTabs) {
        const activeLang = shadowRoot?.querySelector('.wbm-tab-active')?.dataset.lang;
        if (activeLang) appendInsights(activeLang, request.insights);
      } else {
        appendInsights("en", request.insights);
      }
    }
    if (_pendingInsightsLang) {
      chrome.runtime.sendMessage({
        type: "TRANSLATE_TEXT",
        text: _originalSummary,
        insights: _originalInsights,
        targetLanguage: _pendingInsightsLang,
        action: _currentAction
      });
      _pendingInsightsLang = null;
    }
  }

  else if (request.type === "TRANSLATE_TEXT_RESPONSE") {
    const targetLang = request.targetLanguage;
    const summaryBody = shadowRoot?.querySelector(`.wbm-tab-panel[data-lang="${targetLang}"] .wbm-accordion[data-type="summary"] .wbm-accordion-body`);
    if (summaryBody) {
      const loading = summaryBody.querySelector('.wbm-loading-container');
      if (loading) loading.remove();
      summaryBody.innerHTML = marked.parse(request.translatedText);
    }
    if (request.translatedInsights) {
      appendInsights(targetLang, request.translatedInsights);
    }
  }

});

function handleLanguageChange(newLang) {
  const existingPanel = shadowRoot?.querySelector(`.wbm-tab-panel[data-lang="${newLang}"]`);
  if (!existingPanel) {
    const enPanel = shadowRoot?.querySelector('.wbm-tab-panel[data-lang="en"]');
    if (!enPanel) return;
    const newPanel = enPanel.cloneNode(true);
    newPanel.dataset.lang = newLang;
    newPanel.style.display = 'block';
    enPanel.parentNode.insertBefore(newPanel, enPanel.nextElementSibling);

    newPanel.querySelectorAll('.wbm-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.wbm-accordion-icon');
        const isOpen = body.classList.contains('wbm-accordion-open');
        body.classList.toggle('wbm-accordion-open');
        icon.textContent = isOpen ? '▶' : '▼';
      });
    });

    const summaryBody = newPanel.querySelector('.wbm-accordion[data-type="summary"] .wbm-accordion-body');
    if (summaryBody) {
      summaryBody.innerHTML = '<div class="wbm-loading-container"><div class="wbm-spinner"></div></div>';
    }
    const insightsBody = newPanel.querySelector('.wbm-accordion[data-type="insights"] .wbm-accordion-body');
    if (insightsBody) {
      insightsBody.innerHTML = '<div class="wbm-loading-container"><div class="wbm-spinner"></div></div>';
    }
  } else {
    existingPanel.style.display = 'block';

    const summaryBody = existingPanel.querySelector('.wbm-accordion[data-type="summary"] .wbm-accordion-body');
    if (summaryBody && !summaryBody.querySelector('.wbm-loading-container')) {
      summaryBody.innerHTML = '<div class="wbm-loading-container"><div class="wbm-spinner"></div></div>';
    }
    const insightsBody = existingPanel.querySelector('.wbm-accordion[data-type="insights"] .wbm-accordion-body');
    if (insightsBody && !insightsBody.querySelector('.wbm-loading-container')) {
      insightsBody.innerHTML = '<div class="wbm-loading-container"><div class="wbm-spinner"></div></div>';
    }
  }

  if (_originalInsights) {
    chrome.runtime.sendMessage({
      type: "TRANSLATE_TEXT",
      text: _originalSummary,
      insights: _originalInsights,
      targetLanguage: newLang,
      action: _currentAction
    });
  } else {
    _pendingInsightsLang = newLang;
    chrome.runtime.sendMessage({
      type: "TRANSLATE_TEXT",
      text: _originalSummary,
      targetLanguage: newLang,
      action: _currentAction
    });
  }
}

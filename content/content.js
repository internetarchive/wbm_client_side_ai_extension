let _originalSummary = "";
let _originalInsights = null;
let _currentAction = "";
let _pendingInsightsLang = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request.action;
  if(request.type === "REQUEST_CONTENT") {
    analyzePage(sendResponse, action);
    return true;
  }

  else if (request.type === "SHOW_RESULT") {
    showResultOverlay(request.summary);
  }

  else if (request.type === "STREAM_START") {
    _currentAction = request.action;
    createStreamingOverlay(request.action, request.targetLanguage, request.action === "summarize");
    window.__onLanguageChange = handleLanguageChange;
  }

  else if (request.type === "STREAM_CHUNK") {
    appendStreamChunk(request.chunk);
  }

  else if (request.type === "STREAM_ERROR") {
    if (streamContentElement) {
      streamContentElement.textContent = `Error: ${request.error}`;
    }
    if (typeof addProcessStep === "function") {
      addProcessStep(`Error: ${request.error}`, "error");
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
    if (typeof addProcessStep === "function") {
      if (streamedText.length === 0) {
        addProcessStep(`Loaded from cache`, "done");
      } else {
        addProcessStep("Analysis complete", "done");
      }
    }
    if (request.action === "quality" && request.timings) {
      appendQualityTimings(request.timings);
      if (typeof addProcessStep === "function") {
        const total = request.timings.totalResources;
        const blocking = request.timings.renderBlockingCount;
        addProcessStep(`Page audit: ${total} resources (${blocking} render-blocking)`, "done");
      }
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
    if (typeof addProcessStep === "function") {
      const faqCount = request.insights?.faqs?.length || 0;
      const peopleCount = request.insights?.famousPeople?.length || 0;
      const parts = [];
      if (faqCount) parts.push(`${faqCount} FAQs`);
      if (peopleCount) parts.push(`${peopleCount} notable personalities`);
      if (parts.length) {
        addProcessStep(`Extracted ${parts.join(" and ")}`, "done");
      } else {
        addProcessStep("Insights generated", "done");
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
    if (typeof addProcessStep === "function") {
      const langName = getLanguageDisplayName(targetLang);
      const hadInsights = request.translatedInsights?.faqs?.length || request.translatedInsights?.famousPeople?.length;
      addProcessStep(`Translated to ${langName} (summary${hadInsights ? " + insights" : ""})`, "done");
    }
  }

  else if (request.type === "COMPARE_RESULT") {
    try {
      if (request.tsA && request.url) {
        _currentSnapshotRef = { ts: request.tsA, url: request.url };
      }
      showCompareOverlay(request);
    } catch (e) {
      showResultOverlay("Compare error: " + e.message);
    }
  }

  else if (request.type === "COMPARE_SHOW_INPUT") {
    showCompareInput(request);
  }

  else if (request.type === "COMPARE_LOADING") {
    showCompareLoading(request.error ?? "Starting comparison...");
  }

  else if (request.type === "COMPARE_PROGRESS") {
    appendCompareStep(request.step, request.status || "done");
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

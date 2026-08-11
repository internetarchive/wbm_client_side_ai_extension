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
  }

});

if (isBrowserSupported() && !window.__wbmAiAnalyzed && isArchivedPage()) {
  window.__wbmAiAnalyzed = true;
  analyzePage();
}
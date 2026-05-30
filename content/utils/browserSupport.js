function isBrowserSupported() {
  if(typeof LanguageModel === "undefined") {
    showOverlay('Built-in AI not supported in this browser')
    return false;
  } 
  return true;
}
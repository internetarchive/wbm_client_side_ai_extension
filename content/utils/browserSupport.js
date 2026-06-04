/**
 * Feature detection for Chrome's Built-in AI API.
 * The extension relies on LanguageModel for on-device page analysis,
 * so we exit early on unsupported browsers.
 */

function isBrowserSupported() {
  if(typeof LanguageModel === "undefined") {
    showOverlay('Built-in AI not supported in this browser')
    return false;
  } 
  return true;
}

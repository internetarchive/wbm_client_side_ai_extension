/*** This is the main function that will be called after checking the below points:
  -> If the browser supports the builtin AI or not.
  -> If the page that the user is currently on is a real archived page.
  -> This function also uses a variable to ensure that the function analyzePage is called only once.
*/
if (isBrowserSupported() && !window.__wbmAiAnalyzed && isArchivedPage()) {
  window.__wbmAiAnalyzed = true;
  analyzePage();
}
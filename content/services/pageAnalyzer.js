async function analyzePage(sendResponse) {

  const content = extractPageContent();
  
  if (content.length < 100) {
    console.log("Not enough content to analyze");
    showOverlay("Wayback Machine AI Extension", "Not enough content to analyze on this page.");
    sendResponse({ content: null });
    return;
  }

  const timings = getPageTimings();
  sendResponse({ content, timings });
}

async function analyzePage(sendResponse, action) {

  if(action === "quality") {
    const timings = getPageTimings();
    sendResponse({ content: null, timings });
    return;
  }
  const content = extractPageContent();
  
  if (content.length < 100) {
    console.log("Not enough content to analyze");
    showOverlay("Wayback Machine AI Extension", "Not enough content to analyze on this page.");
    sendResponse({ content: null });
    return;
  }

  
  sendResponse({ content, timings });
}

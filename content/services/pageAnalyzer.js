async function analyzePage(sendResponse) {

  const content = extractPageContent();
  
  if (content.length < 100) {
    console.log("Not enough content to analyze");
    showOverlay("Wayback Machine AI Extension", "Not enough content to analyze on this page.");
    sendResponse({ content: null });
    return;
  }

  showOverlay("Wayback Machine AI Extension", "⏳ Analyzing page...");
  sendResponse({ content: content });
}

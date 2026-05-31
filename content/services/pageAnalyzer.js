/**
 * Entry point for page analysis.
 *
 * Validates AI availability, extracts readable page content,
 * and presents available AI actions (summarize, explain, etc.).
 * Once the user selects an action, the request is forwarded
 * to the background script for processing and the result is
 * displayed in an overlay.
 */


async function analyzePage() {

  const isAvailable = await checkAIAvailability();
  if (!isAvailable) return;

  const content = extractPageContent();
  
  if (content.length < 100) {
    console.log("Not enough content to analyze");
    return;
  }

  showActionPanel((action) => {
    showOverlay("⏳ Analyzing page...");
    console.log("Sending content to background for analysis...");
    chrome.runtime.sendMessage(
    { type: "ANALYZE_PAGE", content: content, action: action },
    (response) => {
      if (response?.success) {
        console.log("Summary:", response.summary);
        showOverlay(response.summary);
      } else {
        console.error("Analysis failed:", response?.error);
        showOverlay("Sorry! The summary could not be generated this time!")
      }
    }
  );
  })
}

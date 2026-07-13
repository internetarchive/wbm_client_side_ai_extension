chrome.runtime.sendMessage({ target: 'background', type: 'OFFSCREEN_READY' });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXTRACT_TEXT") {
    try {
      const doc = new DOMParser().parseFromString(request.html, "text/html");
      const article = new Readability(doc).parse();
      sendResponse({
        title: article?.title || "",
        textContent: article?.textContent || doc.body?.textContent || ""
      });
    } catch (e) {
      sendResponse({ title: "", textContent: "", error: e.message });
    }
    return true;
  }
});

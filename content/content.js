chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request.action;
  if(request.type === "REQUEST_CONTENT") {
    analyzePage(sendResponse);
    return true;
  }
  else if(request.type === "SHOW_SUMMARY_RESULT") {
    showResult(action, request.success, request.summary);
  } 
  else if(request.type === "SHOW_QUALITY_RESULT") {
    showResult(action, request.success, request.summary, request.timings)
  }
});

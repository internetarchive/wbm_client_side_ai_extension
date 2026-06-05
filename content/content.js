chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request.action;
  if(request.type === "REQUEST_CONTENT") {
    analyzePage(sendResponse);
    return true;
  }
  else if(request.type === "SHOW_RESULT") {
    showResult(action, request.success, request.summary);
  } 
  else if(request.type === "SHOW_LOADING") {
    showResult(action, request.success, request.summary);
  }
});

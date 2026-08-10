chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request.action;
  if(request.type === "REQUEST_CONTENT") {
    const result = analyzePage(sendResponse);
    return true;
  }

  else if (request.type === "STREAM_START") {
    createStreamingOverlay(request.action);
  }

  else if (request.type === "STREAM_CHUNK") {
    appendStreamChunk(request.chunk);
  }

  else if (request.type === "STREAM_END") {
    finishStream();
  }

  else if (request.type === "STREAM_ERROR") {
    if (streamContentElement) {
      streamContentElement.textContent =
        `Error: ${request.error}`;
    }
  }

  else if (request.type === "TRANSLATED_RESULT") {
    showOverlay(action, request.summary);
  }

  else if (request.type === "TIMING_RESULT") {
    showOverlay(action, request.summary, request.timings);
  }
  
});

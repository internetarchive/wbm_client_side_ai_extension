function showResult(action, success, summary, timings) {
    if(!action) action = "Wayback Machine AI Extension"
    if (success && action === "summarize") {
      showOverlay(action, summary);
    } 
    else if(success && action === "quality") {
      showOverlay(action, summary, timings);
    }
    else {
      showOverlay(action, `Sorry! The result could not be generated this time!\n${summary}`);
    }
}

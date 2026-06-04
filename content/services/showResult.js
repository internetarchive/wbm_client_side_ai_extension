function showResult(action, success, summary) {
    if(!action) action = "Wayback Machine AI Extension"
    if (success) {
      showOverlay(action, summary);
    } else {
      showOverlay(action, `Sorry! The summary could not be generated this time!\n${summary}`);
    }
}

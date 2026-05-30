async function checkAIAvailability() {
  try {
    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
      showOverlay("❌ On-device AI is not available on your device or browser.");
      return false;
    }
    
    if (availability === "downloadable") {
      showOverlay("⬇️ AI model needs to download first. Please wait and try again later.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('Error occured while checking the AI availability: ', error);
    showOverlay("❌ Could not check AI availability.");
    return false;
  }
}

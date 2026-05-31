/**
 * Verifies that the Built-in AI model is ready to accept prompts.
 *
 * The API can be:
 * - available: ready for use
 * - downloadable: model exists but has not been downloaded yet
 * - unavailable: AI is not supported on this device/browser
 *
 * User-friendly messages are shown for unsupported states so the
 * analysis flow can exit early before sending any requests.
 */

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

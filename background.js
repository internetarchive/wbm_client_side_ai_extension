import { AISession } from "./ai/utility.js";

const aiSession = new AISession();

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "wbm-parent",
    title: "Wayback Machine AI Helper",
    contexts: ["page", "selection"],
    documentUrlPatterns: ["*://web.archive.org/web/*"]
  });

  chrome.contextMenus.create({
    id: "quality",
    parentId: "wbm-parent",
    title: "Check page quality",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "summarize",
    parentId: "wbm-parent",
    title: "Summarize Page",
    contexts: ["page"]
  });
  console.log("Extension installed!");
  await aiSession.init();
});

function isPlaybackPage(url) {
  return /web\.archive\.org\/web\/\d{14}/.test(url);
}
function isBrowserSupported() {
  return typeof LanguageModel !== "undefined";
}

async function checkAIAvailability() {
  try {
    const availability = await LanguageModel.availability();
    if (availability === "unavailable" || availability === "downloadable") {
      return false;
    }
    return true;
  } catch (error) {
    console.log('Error occurred while checking the AI availability: ', error);
    return false;
  }
}


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if(!isPlaybackPage(tab.url)) {
    console.log("It is not a playback page!");
    chrome.tabs.sendMessage(
      tab.id,
      { type: "SHOW_RESULT", 
        success: false,
        summary: "This page is not a valid archive. Please navigate to a specific snapshot."
      }
    );
    return;
  }

  if(!isBrowserSupported()) {
    console.log("Sorry the browser is not supported!");
    chrome.tabs.sendMessage(
      tab.id,
      { type: "SHOW_RESULT", 
        success: false,
        summary: "Built-in AI is not supported in this browser."
      }
    );
    return;
  }

  if (!(await checkAIAvailability())) {
    console.log("Sorry the built in AI is not available!");
    chrome.tabs.sendMessage(
      tab.id,
      { type: "SHOW_RESULT", 
        success: false,
        summary: "Built-in AI is not supported."
      }
    );
    return;
  }

  if (info.menuItemId === "summarize" || info.menuItemId === "quality") {
    chrome.storage.sync.get(['targetLanguage'], async (result) => {
      const targetLanguage = result.targetLanguage || 'en';
      chrome.tabs.sendMessage(
        tab.id, 
        { type: "REQUEST_CONTENT", action: info.menuItemId }, 
        async (response) => {
          if (!response || !response.content) return;

          const timings = response.timings;
          const timingSummary = `
Page Resources: ${timings.totalResources} total
Render blocking: ${timings.renderBlockingCount}
Scripts: ${timings.scripts.map(s => `${s.name}(${s.duration}ms)`).join(', ')}
Stylesheets: ${timings.stylesheets.map(s => `${s.name}(${s.duration}ms)`).join(', ')}
    `;
          console.log(`Analyzing for action: ${info.menuItemId}`);

          const [analysisResult, insights] = await Promise.all([
            aiSession.analyzePage(response.content, timingSummary, info.menuItemId, targetLanguage, tab.id),
            info.menuItemId === "summarize"
              ? aiSession.getStructuredInsights(response.content)
              : Promise.resolve({ faqs: [], famousPeople: [] })
          ]);

          chrome.tabs.sendMessage(tab.id, {
            type: "TRANSLATED_RESULT",
            action: info.menuItemId,
            success: Boolean(analysisResult?.success),
            summary: analysisResult?.summary ?? analysisResult?.error,
            originalSummary: analysisResult?.originalSummary,
            timings: info.menuItemId === "quality" ? timings : undefined,
            targetLanguage
          })

          if (insights && (insights.faqs?.length || insights.famousPeople?.length)) {
            if (targetLanguage && targetLanguage !== "en") {
              const translatedInsights = await aiSession.translateInsights(insights, targetLanguage);
              chrome.tabs.sendMessage(tab.id, {
                type: "STRUCTURED_INSIGHTS",
                insights,
                translatedInsights,
                targetLanguage
              });
            } else {
              chrome.tabs.sendMessage(tab.id, {
                type: "STRUCTURED_INSIGHTS",
                insights
              });
            }
          }
        }
      );
    })
  }
})

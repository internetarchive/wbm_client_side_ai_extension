import { AISession } from "./ai/utility.js";
import { StorageCleaner } from "./ai/storageCleaner.js";
import { getSnapshotStatus } from "./api/cdx.js";
import { isPlaybackPage } from "./utils/helpers.js";

const aiSession = new AISession();
const storageCleaner = new StorageCleaner();
storageCleaner.runSweep(1);

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


async function handleAction(action, tab) {
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

  chrome.storage.sync.get(['targetLanguage'], async (result) => {
    const targetLanguage = action === "quality" ? "en" : (result.targetLanguage || 'en');

    if (action === "summarize") {
      const cacheKey = `wbm_summarize_${tab.url}_${targetLanguage}`;
      const cachedData = await chrome.storage.local.get([cacheKey]);

      if (cachedData[cacheKey]) {
        console.log(`[Cache] HIT for ${cacheKey}. Serving instantly.`);
        const { timestamp, ...cachedPayload } = cachedData[cacheKey];

        chrome.tabs.sendMessage(tab.id, {
          type: "STREAM_START",
          action,
          targetLanguage
        });

        chrome.tabs.sendMessage(tab.id, {
          type: "TRANSLATED_RESULT",
          ...cachedPayload
        });

        chrome.tabs.sendMessage(tab.id, { type: "STREAM_END" });

        const insightKey = `wbm_insights_${tab.url}_${targetLanguage}`;
        const cachedInsights = await chrome.storage.local.get([insightKey]);
        if (cachedInsights[insightKey]) {
          const { timestamp: _t, ...insightPayload } = cachedInsights[insightKey];
          chrome.tabs.sendMessage(tab.id, {
            type: "STRUCTURED_INSIGHTS",
            ...insightPayload
          });
        }
        return;
      }
    }

    chrome.tabs.sendMessage(tab.id, {
      type: "STREAM_START",
      action,
      targetLanguage
    });

    let screenshotBlob, screenshotDataUrl;
    if (action === "quality") {
      try {
        screenshotDataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
        screenshotBlob = await fetch(screenshotDataUrl).then(r => r.blob());
      } catch (e) {
        console.log("Screenshot capture failed, proceeding without it:", e);
      }
    }

    chrome.tabs.sendMessage(
      tab.id,
      { type: "REQUEST_CONTENT", action },
      async (response) => {
        if (!response || (action === "summarize" && !response.content)) return;

        let timingSummary = '';
        let timings = null;

        if(response.timings == null) timingSummary = '';
        else {
        timings = response.timings;
        timingSummary = `
Page Resources: ${timings.totalResources} total
Render blocking: ${timings.renderBlockingCount}
Scripts: ${timings.scripts.map(s => `${s.name}(${s.duration}ms)`).join(', ')}
Stylesheets: ${timings.stylesheets.map(s => `${s.name}(${s.duration}ms)`).join(', ')}
    `;
        }
        console.log(`Analyzing for action: ${action}`);

        let httpStatus = null;
        if (action === "quality") {
          httpStatus = await getSnapshotStatus(tab.url);
          if (timings) timings.httpStatus = httpStatus;
        }

        const [analysisResult, insights] = await Promise.all([
          aiSession.analyzePage(response.content, timingSummary, action, targetLanguage, tab.id, screenshotBlob, httpStatus),
          action === "summarize"
            ? aiSession.getStructuredInsights(response.content)
            : Promise.resolve({ faqs: [], famousPeople: [] })
        ]);

        const resultPayload = {
          action,
          success: Boolean(analysisResult?.success),
          summary: analysisResult?.summary ?? analysisResult?.error,
          originalSummary: analysisResult?.originalSummary,
          timings: action === "quality" ? timings : undefined,
          targetLanguage
        };

        // Cache successful summarize result (screenshot excluded — see cache-report.md §6.2)
        if (analysisResult?.success && action === "summarize") {
          const cacheKey = `wbm_summarize_${tab.url}_${targetLanguage}`;
          await chrome.storage.local.set({
            [cacheKey]: {
              ...resultPayload,
              timestamp: Date.now()
            }
          });
        }

        chrome.tabs.sendMessage(tab.id, {
          type: "TRANSLATED_RESULT",
          screenshot: action === "quality" ? screenshotDataUrl : undefined,
          ...resultPayload
        });

        // Cache & send insights (summarize only)
        if (action === "summarize" && insights && (insights.faqs?.length || insights.famousPeople?.length)) {
          const insightPayload = { insights };

          if (targetLanguage && targetLanguage !== "en") {
            insightPayload.translatedInsights = await aiSession.translateInsights(insights, targetLanguage);
            insightPayload.targetLanguage = targetLanguage;
          }

          const insightKey = `wbm_insights_${tab.url}_${targetLanguage}`;
          await chrome.storage.local.set({
            [insightKey]: {
              ...insightPayload,
              timestamp: Date.now()
            }
          });

          chrome.tabs.sendMessage(tab.id, {
            type: "STRUCTURED_INSIGHTS",
            ...insightPayload
          });
        }
      }
    );
  })
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize" || info.menuItemId === "quality") {
    await handleAction(info.menuItemId, tab);
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PERFORM_ACTION") {
    chrome.tabs.get(request.tabId, (tab) => {
      if (tab) handleAction(request.action, tab);
    });
    sendResponse({});
    return;
  }

  if (request.type === "TRANSLATE_TEXT") {
    (async () => {
      try {
        const translatedText = await aiSession.translateResult(request.text, request.targetLanguage);
        let translatedInsights = null;
        if (request.insights) {
          translatedInsights = await aiSession.translateInsights(request.insights, request.targetLanguage);
        }
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "TRANSLATE_TEXT_RESPONSE",
          translatedText,
          translatedInsights,
          targetLanguage: request.targetLanguage
        });
      } catch (error) {
        console.error("Translation failed:", error);
      }
    })();
    return true;
  }
})

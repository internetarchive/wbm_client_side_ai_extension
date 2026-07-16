import { AISession } from "./ai/utility.js";
import { StorageCleaner } from "./ai/storageCleaner.js";
import { cdxBase } from "./api/cdx.js";
import { isPlaybackPage, parsePlaybackUrl, parseDiff } from "./utils/helpers.js";
import { WordDiffEngine } from "./utils/diff.js";

const aiSession = new AISession();
const storageCleaner = new StorageCleaner();
storageCleaner.runSweep(1);
const cdx = new cdxBase();
const wordDiff = new WordDiffEngine();

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

  chrome.contextMenus.create({
    id: "compare",
    parentId: "wbm-parent",
    title: "Compare Snapshots",
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

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (contexts.length > 0) return;
  try {
    const offscreenReady = new Promise((resolve, reject) => {
      const listener = (message) => {
        if(message && message.target === "background" && message.type === "OFFSCREEN_READY") {
          chrome.runtime.onMessage.removeListener(listener);
          resolve();
        }
      }
      chrome.runtime.onMessage.addListener(listener);
    })
    await chrome.offscreen.createDocument({
      url: "offscreen/offscreen.html",
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: "Parse archived HTML with Readability for text extraction"
    });
    await offscreenReady;
  } catch (e) {
    if (!e.message.includes("already exists")) throw e;
  }
}

async function extractTextViaOffscreen(html) {
  const timer = new Promise((_, rej) => {
    setTimeout(()=> rej(new Error("Timeout waiting for the response from the offscreen doc for the extracted content")), 5000);
  })
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: "EXTRACT_TEXT", html }),
      timer
    ]);
    if(!response) {
      throw new Error("Received empty response from offscreen document");
    }
    return response;
  } catch (error) {
    console.error("Extraction failed:", error.message);
    throw error;
  }
}

async function handleCompare(tab) {
  const parsed = parsePlaybackUrl(tab.url);
  if (!parsed) {
    chrome.tabs.sendMessage(tab.id, {
      type: "COMPARE_RESULT",
      success: false,
      error: "This page is not a valid archive. Please navigate to a specific snapshot."
    });
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "COMPARE_SHOW_INPUT",
    ts: parsed.ts,
    url: parsed.url
  });
}


async function handleAction(action, tab) {
  if (action === "compare") {
    await handleCompare(tab);
    return;
  }

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
          httpStatus = await cdx.getSnapshotStatus_quality(tab.url);
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
  if (info.menuItemId === "summarize" || info.menuItemId === "quality" || info.menuItemId === "compare") {
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

  if (request.type === "COMPARE_PARSE_INPUT") {
    (async () => {
      const tabId = sender.tab.id;
      console.log("Compare input:", request.text);
      chrome.tabs.sendMessage(tabId, {
        type: "COMPARE_RESULT",
        success: true,
        titleA: "Current Snapshot",
        titleB: "Target Snapshot",
        tsA: "20240315",
        tsB: "20220101",
        diff: [
          { type: "unchanged", value: "AI timestamp parsing will be implemented next.\n" },
          { type: "added", value: `Your input: "${request.text}"\n` }
        ],
        stats: { added: 1, removed: 0 },
        aiSummary: `You asked: "${request.text}". AI parsing coming in the next phase!`,
        url: sender.tab?.url || ""
      });
    })();
    return true;
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

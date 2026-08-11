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
const _chatStreamControllers = {};

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.removeAll(() => {
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
  });
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


async function handleLiveCompare(tab) {
  if (isPlaybackPage(tab.url)) {
    handleCompare(tab);
    return;
  }

  const liveUrl = tab.url;
  const liveTitle = tab.title || "";

  chrome.tabs.sendMessage(tab.id, { type: "COMPARE_LOADING" });

  try {
    chrome.tabs.sendMessage(tab.id, { type: "COMPARE_PROGRESS", step: "Finding archived version..." });
    const archiveTs = await cdx.getLastCapture(liveUrl);
    if (!archiveTs) {
      chrome.tabs.sendMessage(tab.id, { type: "COMPARE_RESULT", success: false, error: "No archived version found for this page." });
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "COMPARE_PROGRESS", step: "Getting live page content..." });
    chrome.tabs.sendMessage(tab.id, { type: "REQUEST_CONTENT", action: "summarize" }, async (response) => {
      try {
        if (!response || !response.content) {
          chrome.tabs.sendMessage(tab.id, { type: "COMPARE_RESULT", success: false, error: "Could not extract content from the live page." });
          return;
        }
        const liveContent = response.content.replace(/^Title:\s*.*?\n\n/, "");

        chrome.tabs.sendMessage(tab.id, { type: "COMPARE_PROGRESS", step: "Fetching archived version..." });
        const archivedHtml = await fetch(`https://web.archive.org/web/${archiveTs}id_/${liveUrl}`).then(r => r.text());

        chrome.tabs.sendMessage(tab.id, { type: "COMPARE_PROGRESS", step: "Extracting archived content via Readability..." });
        await ensureOffscreenDocument();
        const cleanArchive = await extractTextViaOffscreen(archivedHtml);
        await chrome.offscreen.closeDocument().catch(() => {});

        chrome.tabs.sendMessage(tab.id, { type: "COMPARE_PROGRESS", step: "Computing differences..." });
        const diff = wordDiff.diff(cleanArchive.textContent, liveContent);
        const { addedCount: added, removedCount: removed, diffLines } = parseDiff(diff);

        let aiSummary = "";
        if (await checkAIAvailability()) {
          chrome.tabs.sendMessage(tab.id, { type: "COMPARE_PROGRESS", step: "Generating AI summary of changes..." });
          aiSummary = await aiSession.summarizeChanges({ before: cleanArchive.title, after: liveTitle }, diffLines);
        }

        const cacheKey = `wbm_compare_${liveUrl}_live_${archiveTs}`;
        await chrome.storage.local.set({
          [cacheKey]: {
            titleA: liveTitle, titleB: cleanArchive.title,
            diff, stats: { added, removed }, aiSummary,
            timestamp: Date.now()
          }
        });

        chrome.tabs.sendMessage(tab.id, {
          type: "COMPARE_RESULT", success: true,
          titleA: liveTitle, titleB: cleanArchive.title,
          tsA: "live", tsB: archiveTs,
          diff, stats: { added, removed }, aiSummary, url: liveUrl
        });
      } catch (error) {
        chrome.tabs.sendMessage(tab.id, { type: "COMPARE_RESULT", success: false, error: `Live comparison failed: ${error.message}` });
      }
    });
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, { type: "COMPARE_RESULT", success: false, error: `Live comparison failed: ${error.message}` });
  }
}

async function handleAction(action, tab) {
  if (action === "compare") {
    await handleCompare(tab);
    return;
  }

  if (action === "live-compare") {
    await handleLiveCompare(tab);
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
  await handleAction(info.menuItemId, tab);
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
      try {
        const originalUrl = request.url;
        const userQuery = request.text.toLowerCase();
      
        chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_LOADING" });

        let tsA;
        let tsB;

        if (userQuery.includes('first') || userQuery.includes('oldest') || userQuery.includes('initial') || userQuery.includes('earliest')) {
          chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Locating the oldest capture..." });
          tsB = await cdx.getFirstCapture(originalUrl);
          tsA = request.ts;
          if (!tsB) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "COMPARE_RESULT",
              success: false,
              error: "Could not find the oldest snapshot to compare with."
            });
            return;
          }
        }
        else if (userQuery.includes('last') || userQuery.includes('latest') || userQuery.includes('newest')) {
          chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Locating the latest capture..." });
          tsB = await cdx.getLastCapture(originalUrl);
          tsA = request.ts;
          if (!tsB) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "COMPARE_RESULT",
              success: false,
              error: "Could not find the latest snapshot to compare with."
            });
            return;
          }
        }
        else {
          chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "AI parsing date request..." });
          const tsResponse = await aiSession.getTimeStamp(request.ts, request.text);
          if (!tsResponse || !tsResponse.tsA || !tsResponse.tsB) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "COMPARE_RESULT",
              success: false,
              error: "Could not find snapshots to compare with."
            });
            return;
          }
          tsA = tsResponse.tsA;
          tsB = tsResponse.tsB;
          console.log("[COMPARE_PARSE_INPUT] AI parsed timestamps:", tsA, tsB);
        }

        if (tsA === tsB) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "COMPARE_RESULT",
            success: false,
            error: "This is the first snapshot that you have opened! Please open another snapshot to compare."
          });
          return;
        }

        if (parseInt(tsA) > parseInt(tsB)) {
          console.log(`[COMPARE] Swapping timestamps to maintain chronological order.`);
          const temp = tsA;
          tsA = tsB;
          tsB = temp;
        }

        chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Checking cache..." });
        const compareCacheKey = `wbm_compare_${originalUrl}_${tsA}_${tsB}`;
        const cached = await chrome.storage.local.get([compareCacheKey]);
        if (cached[compareCacheKey]) {
          console.log(`[Cache] HIT ${compareCacheKey}`);
          chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Cache hit! Serving from cache.", status: "done" });
          const { timestamp: _t, ...cachedPayload } = cached[compareCacheKey];
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "COMPARE_RESULT",
            success: true,
            ...cachedPayload,
            tsA,
            tsB,
            url: originalUrl
          });
          return;
        }

        chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Fetching both snapshots from Wayback Machine..." });
        const [htmlA, htmlB] = await Promise.all([
          fetch(`https://web.archive.org/web/${tsA}id_/${originalUrl}`).then(r => r.text()),
          fetch(`https://web.archive.org/web/${tsB}id_/${originalUrl}`).then(r => r.text())
        ]);

        chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Extracting page text via Readability..." });
        await ensureOffscreenDocument();

        const [cleanA, cleanB] = await Promise.all([
          extractTextViaOffscreen(htmlA),
          extractTextViaOffscreen(htmlB)
        ]);

        await chrome.offscreen.closeDocument().catch(() => {});

        chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Computing word-level diff..." });
        const diff = wordDiff.diff(cleanA.textContent, cleanB.textContent);

        const { addedCount: added, removedCount: removed, diffLines } = parseDiff(diff); 

        let aiSummary = "";
        if (await checkAIAvailability()) {
          chrome.tabs.sendMessage(sender.tab.id, { type: "COMPARE_PROGRESS", step: "Generating AI summary of changes..." });
          aiSummary = await aiSession.summarizeChanges(
            { before: cleanA.title, after: cleanB.title },
            diffLines
          );
        }

        const cacheData = {
          titleA: cleanA.title,
          titleB: cleanB.title,
          diff,
          stats: { added, removed },
          aiSummary,
          timestamp: Date.now()
        };
        await chrome.storage.local.set({ [compareCacheKey]: cacheData });

        chrome.tabs.sendMessage(sender.tab.id, {
          type: "COMPARE_RESULT",
          success: true,
          titleA: cleanA.title,
          titleB: cleanB.title,
          tsA,
          tsB,
          diff,
          stats: { added, removed },
          aiSummary,
          url: originalUrl
        });
      }
      catch (error) {
        console.error("Compare failed:", error);
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "COMPARE_RESULT",
          success: false,
          error: `Comparison failed: ${error.message}`
        });
      }
    })();
    return true;
  }

  if (request.type === "CHAT_RESET") {
    const key = aiSession.compareChatKey;
    aiSession.destroyCompareChat();
    if (key) chrome.storage.local.remove(key);
    sendResponse({});
    return;
  }

  if (request.type === "CHAT_QUESTION_START") {
    (async () => {
      try {
        const { context, question, messageId } = request;
        if (!context || !question || !messageId) {
          chrome.tabs.sendMessage(sender.tab.id, { type: "CHAT_STREAM_ERROR", messageId, error: "Missing parameters." });
          return;
        }

        const sessionKey = `wbm_chat_${context.url}_${context.tsB}_${context.tsA}`;

        if (aiSession.compareChatKey !== sessionKey) {
          aiSession.destroyCompareChat();
          const initialized = await aiSession.compareChatInit(sessionKey, context);
          if (!initialized) {
            chrome.tabs.sendMessage(sender.tab.id, { type: "CHAT_STREAM_ERROR", messageId, error: "AI is not available." });
            return;
          }
        }

        const controller = new AbortController();
        _chatStreamControllers[messageId] = controller;

        try {
          const fullText = await aiSession.compareChatStream(question, (chunk) => {
            chrome.tabs.sendMessage(sender.tab.id, { type: "CHAT_STREAM_CHUNK", messageId, chunk });
          }, controller.signal);

          chrome.tabs.sendMessage(sender.tab.id, { type: "CHAT_STREAM_END", messageId, fullText });
        } catch (err) {
          if (err.name === 'AbortError') {
            chrome.tabs.sendMessage(sender.tab.id, { type: "CHAT_STREAM_END", messageId, fullText: "" });
          } else {
            throw err;
          }
        } finally {
          delete _chatStreamControllers[messageId];
        }
      } catch (error) {
        console.error("Chat stream error:", error);
        chrome.tabs.sendMessage(sender.tab.id, { type: "CHAT_STREAM_ERROR", messageId, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === "CHAT_STOP") {
    const { messageId } = request;
    if (messageId && _chatStreamControllers[messageId]) {
      _chatStreamControllers[messageId].abort();
      delete _chatStreamControllers[messageId];
    }
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

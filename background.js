import { AISession } from "./ai/utility.js";

const aiSession = new AISession();

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "wbm-parent",
    title: "Wayback Machine AI Helper",
    contexts: ["all"] 
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
    id: "translate",
    parentId: "wbm-parent",
    title: "Translate Text",
    contexts: ["selection"]
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
    console.log('Error occured while checking the AI availability: ', error);
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
    chrome.tabs.sendMessage(
      tab.id, 
      { type: "REQUEST_CONTENT", action: info.menuItemId }, 
      async (response) => {
        if (!response || !response.content) return;

        console.log(`Analyzing for action: ${info.menuItemId}`);
        const result = await aiSession.analyzePage(response.content, info.menuItemId);
        chrome.tabs.sendMessage(tab.id, { 
          type: "SHOW_RESULT", 
          action: info.menuItemId,
          success: result?.success, 
          summary: result?.summary 
        });
      }
    );
  }
  else if(info.menuItemId === "translate") {
    const selectedText = info.selectionText;
    chrome.storage.sync.get(['targetLanguage'], async (result) => {
      const targetLanguage = result.targetLanguage || 'en';
      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_LOADING",
        success: true,
        summary: `⏳ Translating to: ${targetLanguage}`
      })
      console.log(`Translating to: ${targetLanguage}`);
      const translation = await aiSession.analyzePage(
        selectedText, 
        info.menuItemId,
        targetLanguage
      );

      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_RESULT",
        action: "translate",
        success: translation?.success,
        summary: translation?.summary
      });
    })
  }
})

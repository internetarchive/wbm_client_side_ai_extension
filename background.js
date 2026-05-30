import { AISession } from "./ai/utility.js";

const aiSession = new AISession();

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed!");
  await aiSession.init();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_PAGE") {
    handlePageAnalysis(message.content, message.action, sendResponse);
    return true;
  }
});

async function handlePageAnalysis(pageContent, action, sendResponse) {
  console.time("AI response");
  const result = await aiSession.analyzePage(pageContent, action);
  console.timeEnd('AI response');
  sendResponse(result);
}
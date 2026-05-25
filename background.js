import { AISession } from "./ai/utility.js";

const aiSession = new AISession();

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed!");
  await aiSession.init();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_PAGE") {
    handlePageAnalysis(message.content, sendResponse);
    return true;
  }
});

async function handlePageAnalysis(pageContent, sendResponse) {
  console.time("AI response");
  const result = await aiSession.analyzePage(pageContent);
  console.timeEnd('AI response');
  sendResponse(result);
}
function extractPageContent() {
  const toolbar = document.getElementById("wm-ipp-base");
  if (toolbar) toolbar.remove();

  const contentElements = document.querySelectorAll(
    "article, main, section, p"
  );
  
  let text = "";
  contentElements.forEach((el) => {
    text += el.innerText + " ";
  });

  if (text.trim().length < 100) {
    text = document.body.innerText;
  }

  return text.trim().slice(0, 4000);
}

async function analyzePage() {
  const content = extractPageContent();
  
  if (content.length < 100) {
    console.log("Not enough content to analyze");
    return;
  }

  console.log("Sending content to background for analysis...");

  chrome.runtime.sendMessage(
    { type: "ANALYZE_PAGE", content: content },
    (response) => {
      if (response?.success) {
        console.log("Summary:", response.summary);
        showOverlay(response.summary);
      } else {
        console.error("Analysis failed:", response?.error);
      }
    }
  );
}

function showOverlay(summary) {
  const overlay = document.createElement("div");
  overlay.id = "wbm-ai-overlay";
  overlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: #1a1a2e;
    color: #ffffff;
    padding: 16px;
    border-radius: 8px;
    font-family: sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  overlay.innerHTML = `
    <strong>🤖 AI Summary</strong>
    <p style="margin-top: 8px">${summary}</p>
    <button onclick="this.parentElement.remove()" 
      style="margin-top: 8px; cursor: pointer; background: #444; color: white; border: none; padding: 4px 8px; border-radius: 4px;">
      Close
    </button>
  `;
  document.body.appendChild(overlay);
}

analyzePage();
function removeDiv() {
  const elements = document.querySelectorAll('#wbm-ai-overlay');
  elements.forEach(el => el.remove());
}

function showOverlay(summary) {
  // We want to remove the previous overlays (if any) before creating a new one
  removeDiv();

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
  `;
  const button = document.createElement("button");
  button.textContent = "Close";
  button.style.cssText = `
    margin-top: 8px;
    cursor: pointer;
    background: #444;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
  `;
  button.addEventListener("click", removeDiv);
  overlay.appendChild(button);
  document.body.appendChild(overlay);
}

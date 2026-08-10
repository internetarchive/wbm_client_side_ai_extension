function showActionPanel(onAction) {
  const existing = document.getElementById("wbm-ai-overlay");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "wbm-ai-overlay";
  panel.style.cssText = `
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
  panel.innerHTML = `
    <strong>🤖 Wayback AI</strong>
    <p style="margin-top: 8px; color: #aaaaaa; font-size: 12px;">
      What would you like to do with this page?
    </p>
    <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
      <button id="wbm-summarize" style="
        background: #4a90e2; color: white; border: none;
        padding: 8px 12px; border-radius: 6px; cursor: pointer;
        font-size: 13px; text-align: left;">
        📝 Summarize this page
      </button>
      <button id="wbm-quality" style="
        background: #5c6bc0; color: white; border: none;
        padding: 8px 12px; border-radius: 6px; cursor: pointer;
        font-size: 13px; text-align: left;">
        🔍 Check page quality
      </button>
      <button id="wbm-dismiss" style="
        background: #333; color: #aaa; border: none;
        padding: 8px 12px; border-radius: 6px; cursor: pointer;
        font-size: 13px; text-align: left;">
        ❌ Dismiss
      </button>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("wbm-summarize").onclick = () => onAction("summarize");
  document.getElementById("wbm-quality").onclick = () => onAction("quality");
  document.getElementById("wbm-dismiss").onclick = () => panel.remove();
}

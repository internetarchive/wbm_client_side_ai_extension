let shadowRoot = null;

function createShadowHost() {
  const existingHost = document.getElementById('wbm-ai-host');
  if (existingHost) existingHost.remove();

  const host = document.createElement('div');
  host.id = 'wbm-ai-host';
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  #wbm-ai-popup {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 360px;
    max-width: 90%;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;

    /* Heavy glassmorphism like macOS */
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 18px;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 4px 16px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      inset 0 -1px 0 rgba(0, 0, 0, 0.04);

    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.6;
    letter-spacing: -0.01em;

    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  #wbm-ai-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;

    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #3a3a3c;
  }

  #wbm-ai-content {
    padding: 14px 16px;
    max-height: 400px;
    overflow-y: auto;
    font-size: 13.5px;
    color: #1c1c1e;
    line-height: 1.7;
    letter-spacing: -0.01em;
  }

  #wbm-ai-content::-webkit-scrollbar {
    width: 3px;
  }
  #wbm-ai-content::-webkit-scrollbar-track {
    background: transparent;
  }
  #wbm-ai-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.12);
    border-radius: 3px;
  }

  #wbm-ai-content p {
    margin-bottom: 8px;
  }
  #wbm-ai-content ul {
    padding-left: 16px;
    margin-bottom: 8px;
  }
  #wbm-ai-content li {
    margin-bottom: 5px;
  }
  #wbm-ai-content strong {
    font-weight: 600;
    color: #000000;
  }
  #wbm-ai-content h1,
  #wbm-ai-content h2,
  #wbm-ai-content h3 {
    font-weight: 600;
    margin-bottom: 6px;
    margin-top: 10px;
    color: #1c1c1e;
    letter-spacing: -0.02em;
  }

  #wbm-ai-close {
    background: rgba(0, 0, 0, 0.07);
    border: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 13px;
    color: #6e6e73;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
    line-height: 1;
  }

  #wbm-ai-close:hover {
    background: rgba(0, 0, 0, 0.13);
    color: #1c1c1e;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-16px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-color-scheme: dark) {
    #wbm-ai-popup {
      background: rgba(28, 28, 30, 0.72);
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 4px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.07),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
    }

    #wbm-ai-header {
      background: rgba(255, 255, 255, 0.04);
      border-bottom-color: rgba(255, 255, 255, 0.07);
      color: #aeaeb2;
    }

    #wbm-ai-content {
      color: #e5e5ea;
    }

    #wbm-ai-content strong {
      color: #ffffff;
    }

    #wbm-ai-content h1,
    #wbm-ai-content h2,
    #wbm-ai-content h3 {
      color: #f2f2f7;
    }

    #wbm-ai-close {
      background: rgba(255, 255, 255, 0.07);
      color: #98989d;
    }

    #wbm-ai-close:hover {
      background: rgba(255, 255, 255, 0.13);
      color: #f2f2f7;
    }

    #wbm-ai-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;
  
  shadowRoot.appendChild(style);
  return shadowRoot;
}

function removeDiv() {
  const host = document.getElementById('wbm-ai-host');
  if (host) host.remove();
  shadowRoot = null;
}

function showOverlay(action, result, timings) {
  const shadow = createShadowHost();

  const popup = document.createElement('div');
  popup.id = 'wbm-ai-popup';

  const header = document.createElement('div');
  header.id = 'wbm-ai-header';
  header.innerText = action; 

  const closeButton = document.createElement('button');
  closeButton.id = 'wbm-ai-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close overlay');
  closeButton.innerText = '×'; 
  closeButton.onclick = () => removeDiv();

  const content = document.createElement('div');
  content.id = 'wbm-ai-content';
  

  if(action === "quality") {
    const totalRes = timings?.totalResources;
    const scriptCount = (timings?.grouped["script"] || []).length;
    const cssCount = (timings?.grouped["css"] || []).length;
    const imgCount = (timings?.grouped["img"] || []).length;
    const otherCount = totalRes - scriptCount - cssCount - imgCount;

    const barWidth = (count) => Math.round((count / Math.max(totalRes, 1)) * 100);
    const timingHTML = `
      <div class="wbm-section">
        <div class="wbm-section-title">AI Analysis</div>
        <div class="wbm-ai-result">${marked.parse(result)}</div>
      </div>
      <div class="wbm-section">
        
        <div class="wbm-section-title">📊 Resource Breakdown</div>
        
        <div class="wbm-stat-row">
          <span class="wbm-stat-label">Total Resources</span>
          <span class="wbm-stat-value">${totalRes}</span>
        </div>

        ${timings.pageTiming ? `
        <div class="wbm-stat-row">
          <span class="wbm-stat-label">DOM Content Loaded</span>
          <span class="wbm-stat-value">${timings.pageTiming.domContentLoaded}ms</span>
        </div>
        <div class="wbm-stat-row">
          <span class="wbm-stat-label">Fully Loaded</span>
          <span class="wbm-stat-value">${timings.pageTiming.fullyLoaded}ms</span>
        </div>
        ` : ''}

        <div class="wbm-bars">
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">JS</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-script" style="width: ${barWidth(scriptCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${scriptCount}</span>
          </div>
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">CSS</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-css" style="width: ${barWidth(cssCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${cssCount}</span>
          </div>
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">IMG</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-img" style="width: ${barWidth(imgCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${imgCount}</span>
          </div>
          <div class="wbm-bar-row">
            <span class="wbm-bar-label">Other</span>
            <div class="wbm-bar-track">
              <div class="wbm-bar wbm-bar-other" style="width: ${barWidth(otherCount)}%"></div>
            </div>
            <span class="wbm-bar-count">${otherCount}</span>
          </div>
        </div>

        ${timings.renderBlockingCount > 0 ? `
        <div class="wbm-warning">
          ⚠️ ${timings.renderBlockingCount} render-blocking resource${timings.renderBlockingCount > 1 ? 's' : ''} detected
        </div>
        ` : `
        <div class="wbm-success">
          ✅ No render-blocking resources
        </div>
        `}

        ${timings.scripts.length > 0 ? `
        <div class="wbm-subsection">
          <div class="wbm-subsection-title">Top Scripts</div>
          ${timings.scripts.map(s => `
            <div class="wbm-resource-row">
              <span class="wbm-resource-name">${s.name}</span>
              <span class="wbm-resource-time ${s.duration > 500 ? 'wbm-slow' : ''}">${s.duration}ms</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${timings.stylesheets.length > 0 ? `
        <div class="wbm-subsection">
          <div class="wbm-subsection-title">Top Stylesheets</div>
          ${timings.stylesheets.map(s => `
            <div class="wbm-resource-row">
              <span class="wbm-resource-name">${s.name}</span>
              <span class="wbm-resource-time ${s.duration > 300 ? 'wbm-slow' : ''}">${s.duration}ms</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <div class="wbm-divider"></div>
    `;

    content.innerHTML = timingHTML;
    const extraStyle = document.createElement('style');
    extraStyle.textContent = `
      .wbm-section {
        padding: 12px 16px;
      }
      .wbm-section-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #3a3a3c;;
        margin-bottom: 10px;
      }
      .wbm-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
      }
      .wbm-stat-label {
        color: #3a3a3c;;
      }
      .wbm-stat-value {
        font-weight: 600;
        color: #1c1c1e;
        font-variant-numeric: tabular-nums;
      }
      .wbm-bars {
        margin: 10px 0;
      }
      .wbm-bar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .wbm-bar-label {
        font-size: 11px;
        font-weight: 600;
        color: #3a3a3c;;
        width: 32px;
        text-align: right;
      }
      .wbm-bar-track {
        flex: 1;
        height: 6px;
        background: rgba(0,0,0,0.06);
        border-radius: 3px;
        overflow: hidden;
      }
      .wbm-bar {
        height: 100%;
        border-radius: 3px;
        min-width: 4px;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .wbm-bar-script { background: #007aff; }
      .wbm-bar-css { background: #ff9f0a; }
      .wbm-bar-img { background: #30d158; }
      .wbm-bar-other { background: #bf5af2; }
      .wbm-bar-count {
        font-size: 11px;
        font-weight: 600;
        color: #1c1c1e;
        width: 20px;
        font-variant-numeric: tabular-nums;
      }
      .wbm-warning {
        font-size: 12px;
        color: #ff9f0a;
        font-weight: 500;
        margin-top: 8px;
        padding: 6px 10px;
        background: rgba(255, 159, 10, 0.1);
        border-radius: 6px;
      }
      .wbm-success {
        font-size: 12px;
        color: #30d158;
        font-weight: 500;
        margin-top: 8px;
        padding: 6px 10px;
        background: rgba(48, 209, 88, 0.1);
        border-radius: 6px;
      }
      .wbm-subsection {
        margin-top: 10px;
      }
      .wbm-subsection-title {
        font-size: 11px;
        font-weight: 800;
        color: #3a3a3c;
        margin-bottom: 6px;
      }
      .wbm-resource-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 4px;
        gap: 8px;
      }
      .wbm-resource-name {
        color: #1c1c1e;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .wbm-resource-time {
        font-weight: 600;
        color: #30d158;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .wbm-slow {
        color: #ff453a !important;
      }
      .wbm-divider {
        height: 1px;
        background: rgba(0,0,0,0.06);
        margin: 0 16px;
      }
      .wbm-ai-result {
        font-size: 13.5px;
        line-height: 1.7;
        color: #1c1c1e;
      }
      .wbm-ai-result ul {
        padding-left: 16px;
      }
      .wbm-ai-result li {
        margin-bottom: 5px;
      }
      .wbm-ai-result strong {
        font-weight: 600;
        color: #000;
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .wbm-stat-label { color: #c7c7cc; }
        .wbm-bar-label { color: #c7c7cc; }
        .wbm-section-title { color: #c7c7cc; }
        .wbm-subsection-title { color: #c7c7cc; }
      }
      @media (prefers-color-scheme: dark) {
        .wbm-stat-value { color: #f2f2f7; }
        .wbm-bar-track { background: rgba(255,255,255,0.1); }
        .wbm-bar-count { color: #f2f2f7; }
        .wbm-resource-name { color: #e5e5ea; }
        .wbm-ai-result { color: #e5e5ea; }
        .wbm-ai-result strong { color: #fff; }
        .wbm-divider { background: rgba(255,255,255,0.08); }
      }
    `;

    shadow.appendChild(extraStyle);
  }

  else if(action === "summarize") {
    content.innerHTML = marked.parse(result);
  }

  else {
    content.innerHTML = result;
  }

  header.appendChild(closeButton);
  popup.appendChild(header);
  popup.appendChild(content);

  shadow.appendChild(popup);
}

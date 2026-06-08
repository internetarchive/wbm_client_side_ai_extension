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
    #wbm-ai-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      max-width: 90%;
      /* Ensures it doesn't overflow on small screens */
      z-index: 2147483647;
      /* A very high z-index to ensure it appears on top */
      display: flex;
      flex-direction: column;

      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);

      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      text-align: left;
      line-height: 1.5;

      animation: fadeIn 0.3s ease-out;
    }

    #wbm-ai-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background-color: #f7f7f7;
      border-bottom: 1px solid #e0e0e0;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      color: #222222;
      text-transform: capitalize;
    }

    #wbm-ai-content {
      padding: 16px;
      font-size: 14px;
      color: #333333;
      max-height: 450px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    #wbm-ai-close {
      background: none;
      border: none;
      font-size: 22px;
      font-weight: bold;
      color: #999999;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
      transition: color 0.2s ease;
    }

    #wbm-ai-close:hover {
        color: #111111;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-color-scheme: dark) {
      #wbm-ai-popup {
        background-color: #2e2e31;
        border-color: #4a4a4f;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      }

      #wbm-ai-header {
        background-color: #3a3a3e;
        border-bottom-color: #4a4a4f;
        color: #e1e1e1;
      }

      #wbm-ai-content {
        color: #d1d1d1;
      }

      #wbm-ai-close {
        color: #aaaaaa;
      }

      #wbm-ai-close:hover {
        color: #ffffff;
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

function showOverlay(action, result) {
  const shadow = createShadowHost();

  const popup = document.createElement('div');
  popup.id = 'wbm-ai-popup';

  const header = document.createElement('div');
  header.id = 'wbm-ai-header';
  header.innerText = action; 

  const closeButton = document.createElement('button');
  closeButton.id = 'wbm-ai-close';
  closeButton.innerText = '×'; 
  closeButton.onclick = () => removeDiv();

  const content = document.createElement('div');
  content.id = 'wbm-ai-content';
  content.innerText = result;

  header.appendChild(closeButton);
  popup.appendChild(header);
  popup.appendChild(content);

  shadow.appendChild(popup);
}

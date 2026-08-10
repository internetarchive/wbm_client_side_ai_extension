function removeDiv() {
  const host = document.getElementById('wbm-ai-host');
  if (host) host.remove();
  shadowRoot = null;
}

function createBasePopup(action) {
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

  const minimizeButton = document.createElement('button');
  minimizeButton.id = 'wbm-ai-minimize';
  minimizeButton.type = 'button';
  minimizeButton.setAttribute('aria-label', 'Minimize overlay');
  minimizeButton.innerText = '−';

  const content = document.createElement('div');
  content.id = 'wbm-ai-content';

  let isMinimized = false;
  let previousHeight = ''; 

  minimizeButton.onclick = () => {
    isMinimized = !isMinimized;
    
    if (isMinimized) {
      previousHeight = popup.style.height; 
      content.style.display = 'none';
      popup.style.height = 'auto';
      popup.style.minHeight = '0'; 
      popup.style.resize = 'none';
      
      const handle = popup.querySelector('.wbm-resize-handle');
      if (handle) handle.style.display = 'none';
      
      minimizeButton.innerText = '□'; 
      minimizeButton.setAttribute('aria-label', 'Maximize overlay');
    } else {
      content.style.display = 'block';
      popup.style.height = previousHeight || 'auto'; 
      popup.style.minHeight = ''; 
      popup.style.resize = 'both'; 
      
      const handle = popup.querySelector('.wbm-resize-handle');
      if (handle) handle.style.display = 'flex'; 
      
      minimizeButton.innerText = '−';
      minimizeButton.setAttribute('aria-label', 'Minimize overlay');
    }
  };

  const actionsWrapper = document.createElement('div');
  actionsWrapper.style.display = 'flex';
  actionsWrapper.style.gap = '6px';
  actionsWrapper.appendChild(minimizeButton);
  actionsWrapper.appendChild(closeButton);

  header.appendChild(actionsWrapper);
  popup.appendChild(header);
  popup.appendChild(content);

  makeResizable(popup);

  return { popup, content };
}

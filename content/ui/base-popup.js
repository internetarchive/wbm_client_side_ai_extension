function removeDiv() {
  const host = document.getElementById('wbm-ai-host');
  if (host) host.remove();
  shadowRoot = null;
}

function setupMinimizeBehavior(shadow, popupElement) {
  const ballHTML = `
    <div id="wbm-ai-ball" title="Restore AI Window">
      <div class="wbm-vapor-particle wbm-vapor-1"></div>
      <div class="wbm-vapor-particle wbm-vapor-2"></div>
      <div class="wbm-vapor-particle wbm-vapor-3"></div>
    </div>
  `;

  popupElement.insertAdjacentHTML('afterend', ballHTML);
  const ballElement = shadow.querySelector('#wbm-ai-ball');
  
  const minimizeBtn = popupElement.querySelector('#wbm-ai-minimize');

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      popupElement.style.opacity = '0';
      popupElement.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        popupElement.style.display = 'none';
        ballElement.style.display = 'block';
        
        ballElement.style.transform = 'scale(0.5)';
        requestAnimationFrame(() => {
          ballElement.style.transform = 'scale(1)';
        });
      }, 200); 
    });
  }

  ballElement.addEventListener('click', () => {
    ballElement.style.transform = 'scale(0.5)';
    
    setTimeout(() => {
      ballElement.style.display = 'none';
      popupElement.style.display = 'flex';
      
      requestAnimationFrame(() => {
        popupElement.style.opacity = '1';
        popupElement.style.transform = 'scale(1)';
      });
    }, 150);
  });
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

function removeDiv() {
  const elements = document.querySelectorAll('#wbm-ai-popup');
  elements.forEach(el => el.remove());
}

function showOverlay(action, result) {
  // We want to remove the previous overlays (if any) before creating a new one
  removeDiv();

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

  document.body.appendChild(popup);
}

let shadowRoot = null;

function createShadowHost() {
  const existingHost = document.getElementById('wbm-ai-host');
  if (existingHost) existingHost.remove();

  const host = document.createElement('div');
  host.id = 'wbm-ai-host';
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = hostStyle;
  
  shadowRoot.appendChild(style);
  return shadowRoot;
}

function showOverlay(action, result, timings) {
  const shadow = createShadowHost();

  const { popup, content } = createBasePopup(action);

  if(action === "quality") {
    const timingHTML = qualityPopup(timings, result);
    content.innerHTML = timingHTML;
    const extraStyle = document.createElement('style');
    extraStyle.textContent = qualityStyle;
    shadow.appendChild(extraStyle);
  }

  else if(action === "summarize") {
    content.innerHTML = marked.parse(result);
  }

  else {
    content.innerHTML = result;
  }

  shadow.appendChild(popup);
}



let streamContentElement = null;
let streamedText = "";

function createStreamingOverlay(action = "AI Response") {
  const shadow = createShadowHost();

  const { popup, content } = createBasePopup(action);
  

  content.innerHTML = `
  <span style="margin-right: 8px;">Thinking</span>
  <span class="thinking-dots" style="display:inline-flex;">
    <span></span><span></span><span></span>
  </span>
`;

  shadow.appendChild(popup);

  streamContentElement = content;
  streamedText = "";

  return content;
}


function appendStreamChunk(chunk) {
  if (!streamContentElement) return;

  if (streamedText.length === 0) {
    streamContentElement.textContent = "";
  }

  else {
    content.innerHTML = result;
  }

  streamContentElement.append(chunk);

  streamContentElement.scrollTop =
    streamContentElement.scrollHeight;
}



let streamContentElement = null;
let streamedText = "";

function createStreamingOverlay(action = "AI Response") {
  const shadow = createShadowHost();

  const popup = document.createElement("div");
  popup.id = "wbm-ai-popup";

  const header = document.createElement("div");
  header.id = "wbm-ai-header";
  header.textContent = action;

  const closeButton = document.createElement("button");
  closeButton.id = "wbm-ai-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.onclick = () => removeDiv();

  const content = document.createElement("div");
  content.id = "wbm-ai-content";

  content.textContent = "Thinking...";

  header.appendChild(closeButton);
  popup.appendChild(header);
  popup.appendChild(content);

  shadow.appendChild(popup);

  streamContentElement = content;
  streamedText = "";

  return content;
}


function appendStreamChunk(chunk) {
  if (!streamContentElement) return;

  if (streamedText.length === 0) {
    streamContentElement.textContent = "";
  }

  streamedText += chunk;

  // Google recommended approach
  streamContentElement.append(chunk);

  streamContentElement.scrollTop =
    streamContentElement.scrollHeight;
}


function finishStream() {
  if (!streamContentElement) return;

  const html = marked.parse(streamedText);

  streamContentElement.innerHTML = html;
}

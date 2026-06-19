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

  streamedText += chunk;

  streamContentElement.append(chunk);

  streamContentElement.scrollTop =
    streamContentElement.scrollHeight;
}

let _pendingStreamMsgs = {};
let _currentSummaryCtx = null;

function restoreSendBtn(chatSend, chatInput) {
  if (!chatSend) return;
  chatSend._streaming = false;
  chatSend._msgId = null;
  chatSend.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>`;
  chatSend.className = "cmp-chat-send-btn";
  chatSend.disabled = false;
  if (chatInput) { chatInput.disabled = false; chatInput.focus(); }
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "CHAT_STREAM_CHUNK" || request.type === "CHAT_STREAM_END" || request.type === "CHAT_STREAM_ERROR") {
    const pending = _pendingStreamMsgs[request.messageId];
    if (!pending) return false;

    if (request.type === "CHAT_STREAM_CHUNK") {
      if (pending.thinkingEl) {
        pending.thinkingEl.remove();
        pending.thinkingEl = null;
      }
      pending.fullText += request.chunk;
      pending.el.textContent = pending.fullText;
    } else if (request.type === "CHAT_STREAM_END") {
      if (pending.thinkingEl) {
        pending.thinkingEl.remove();
        pending.thinkingEl = null;
      }
      if (pending.fullText) {
        pending.el.innerHTML = marked.parse(pending.fullText);
      } else {
        pending.el.textContent = "Response stopped.";
      }
      restoreSendBtn(pending.chatSend, pending.chatInput);
      delete _pendingStreamMsgs[request.messageId];
    } else {
      if (pending.thinkingEl) {
        pending.thinkingEl.remove();
        pending.thinkingEl = null;
      }
      pending.el.textContent = "Error: " + (request.error || "Unknown error");
      restoreSendBtn(pending.chatSend, pending.chatInput);
      delete _pendingStreamMsgs[request.messageId];
    }
    return false;
  }
  return false;
});

function appendChatMessage(container, role, text) {
  const messages = container.querySelector("#cmp-chat-messages");
  if (!messages) return null;
  const msg = document.createElement("div");
  msg.className = `cmp-chat-msg cmp-chat-msg-${role}`;
  if (role === "ai") {
    msg.innerHTML = marked.parse(text || "");
  } else {
    msg.textContent = text;
  }
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
  return msg;
}

function setupChatStreaming(container, getContext, chatType) {
  const chatInput = container.querySelector("#cmp-chat-input");
  const chatSend = container.querySelector("#cmp-chat-send-btn");
  if (!chatInput || !chatSend) return;

  const sendMsg = () => {
    if (chatSend._streaming) {
      chrome.runtime.sendMessage({ type: "CHAT_STOP", messageId: chatSend._msgId });
      return;
    }
    const context = getContext();
    if (!context) return;
    const text = chatInput.value.trim();
    if (!text) return;
    appendChatMessage(container, "user", text);
    chatInput.value = "";
    const msgEl = appendChatMessage(container, "ai", "");
    const thinkingEl = document.createElement("div");
    thinkingEl.className = "thinking-dots";
    thinkingEl.innerHTML = `<span></span><span></span><span></span>`;
    msgEl.appendChild(thinkingEl);
    const msgId = "cmp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    chatSend._streaming = true;
    chatSend._msgId = msgId;
    chatSend.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>`;
    chatSend.className = "cmp-chat-send-btn cmp-chat-stop-btn";
    _pendingStreamMsgs[msgId] = { el: msgEl, thinkingEl, chatInput, chatSend, fullText: "" };
    chatInput.disabled = true;
    chrome.runtime.sendMessage({
      type: "CHAT_QUESTION_START",
      chatType,
      context,
      question: text,
      messageId: msgId
    });
  };

  chatSend.addEventListener("click", sendMsg);
  chatInput.addEventListener("keydown", e => { if (e.key === "Enter") sendMsg(); });
}

function activateSummaryChat({ summary, originalSummary, targetLanguage }) {
  const input = shadowRoot?.querySelector("#cmp-chat-input");
  const send = shadowRoot?.querySelector("#cmp-chat-send-btn");
  if (!input && !send) return;

  _currentSummaryCtx = {
    url: location.href,
    lang: targetLanguage || "en",
    ts: (location.pathname.match(/^\/web\/(\d{14})/) || [])[1] || "",
    title: document.title || "",
    summary: originalSummary || summary || ""
  };

  if (input) { input.disabled = false; input.placeholder = "Ask about this page..."; }
  if (send) send.disabled = false;
}

function enrichSummaryChatContext(insights) {
  if (!_currentSummaryCtx || !insights) return;
  const faqs = (insights.faqs || []).map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n");
  const people = (insights.famousPeople || []).map(p => `${p.name} - ${p.description}`).join("\n");
  const parts = [];
  if (faqs) parts.push(`FAQs:\n${faqs}`);
  if (people) parts.push(`Notable personalities:\n${people}`);
  if (parts.length) _currentSummaryCtx.insights = parts.join("\n\n");
}

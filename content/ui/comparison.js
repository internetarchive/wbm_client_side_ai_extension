let _compareLoadingRef = null;
let _currentSnapshotRef = null;
let _currentCompareCtx = null;

function showCompareLoading(msg) {
  if (_compareLoadingRef) return;
  const shadow = createShadowHost();
  const style = document.createElement('style');
  style.textContent = compareStyle;
  shadow.appendChild(style);
  const { popup, content } = createBasePopup("Snapshot Comparison");
  popup.style.height = "auto";
  shadow.appendChild(popup);
  setupMinimizeBehavior(shadow, popup);
  content.innerHTML = `
    <div class="wbm-process-log" style="border:none;min-height:80px;max-height:none;">
      <div class="wbm-process-steps">
        <div class="wbm-step wbm-step-active">
          <span class="wbm-step-indicator">→</span>
          <span class="wbm-step-text">${escapeHtml(msg)}</span>
        </div>
      </div>
    </div>`;
  _compareLoadingRef = { shadow, popup, content };
}

function appendCompareStep(step, status) {
  if (!_compareLoadingRef) return;
  const stepsContainer = _compareLoadingRef.content.querySelector('.wbm-process-steps');
  if (!stepsContainer) return;

  const prev = stepsContainer.querySelector('.wbm-step-active');
  if (prev) {
    prev.className = 'wbm-step wbm-step-done';
    prev.querySelector('.wbm-step-indicator').textContent = '✓';
  }

  const stepClass = status === "done" ? "wbm-step-done" :
                    status === "error" ? "wbm-step-error" :
                    "wbm-step-active";
  const indicator = status === "done" ? "✓" :
                    status === "error" ? "✗" :
                    "→";

  stepsContainer.insertAdjacentHTML('beforeend',
    `<div class="wbm-step ${stepClass}">
      <span class="wbm-step-indicator">${indicator}</span>
      <span class="wbm-step-text">${escapeHtml(step)}</span>
    </div>`
  );
}

function showCompareInput(data) {
  _currentSnapshotRef = { ts: data.ts, url: data.url };
  if (typeof _compareLoadingRef !== 'undefined' && _compareLoadingRef) {
    _compareLoadingRef = null;
  }

  const shadow = createShadowHost();
  const style = document.createElement('style');
  style.textContent = compareStyle;
  shadow.appendChild(style);

  const { popup, content } = createBasePopup("Snapshot Comparison");
  shadow.appendChild(popup);
  setupMinimizeBehavior(shadow, popup);

  const demos = [
    "How did this page look exactly a year ago?",
    "Compare the current snapshot with the very first capture",
    "Show me the differences between 2010 and 2015",
    "What changed between last Tuesday and today?"
  ];

  const ts = data.ts || "";
  const displayDate = ts.length >= 8
    ? `${ts.substring(0, 4)}-${ts.substring(4, 6)}-${ts.substring(6, 8)}`
    : "";

  content.innerHTML = `
    <div class="cmp-section cmp-input-screen">
      <div class="cmp-hero">
        <h1 class="cmp-hero-title">Want to compare?</h1>
        <p class="cmp-hero-subtitle">See how this snapshot of the page changed over time against any past version.</p>
        <div class="cmp-snapshot-chip">
          <span class="cmp-snapshot-chip-label">Current Snapshot</span>
          <span class="cmp-snapshot-chip-value">${escapeHtml(displayDate || data.url || "")}</span>
        </div>
      </div>
      <div class="cmp-input-area">
        <p class="cmp-prompt-text">
          Tell me what to compare in plain English:
        </p>
        <div class="cmp-input-group">
          <div class="cmp-input-wrap">
            <input type="text" id="cmp-nl-input" class="cmp-nl-input" autocomplete="off">
            <div class="cmp-nl-placeholder" id="cmp-nl-placeholder">
              ${demos.map((d, i) => `
                <span class="cmp-nl-ph-text ${i === 0 ? 'active' : ''}">${escapeHtml(d)}</span>
              `).join('')}
            </div>
          </div>
          <button id="cmp-submit-btn" class="cmp-submit-btn" aria-label="Submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const phSpans = content.querySelectorAll('.cmp-nl-ph-text');
  let phIndex = 0;

  const phTimer = setInterval(() => {
    const prev = phSpans[phIndex];
    prev.classList.remove('active');
    prev.classList.add('exit');

    phIndex = (phIndex + 1) % phSpans.length;
    const next = phSpans[phIndex];
    next.classList.remove('exit');
    setTimeout(() => next.classList.add('active'), 20);
  }, 3500);

  const input = content.querySelector('#cmp-nl-input');
  const phContainer = content.querySelector('#cmp-nl-placeholder');

  function togglePh() {
    const shadowRoot = input.getRootNode();

    if (shadowRoot.activeElement === input || input.value.trim().length > 0) {
      phContainer.style.opacity = '0';
    } else {
      phContainer.style.opacity = '1';
    }
  }

  input.addEventListener('focus', togglePh);
  input.addEventListener('blur', togglePh);
  input.addEventListener('input', togglePh);
  togglePh();

  const submitBtn = content.querySelector('#cmp-submit-btn');

  function submit() {
    const text = input.value.trim();
    if (!text) return;
    clearInterval(phTimer);

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
      </svg>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;

    content.querySelector('.cmp-section').innerHTML = `
      <div class="wbm-process-log" style="border:none;min-height:60px;max-height:none;padding:24px;">
        <div class="wbm-process-steps">
          <div class="wbm-step wbm-step-active">
            <span class="wbm-step-indicator" style="color:#007aff;">→</span>
            <span class="wbm-step-text" style="font-size:14px;color:#333;">Parsing your request...</span>
          </div>
        </div>
      </div>`;

    chrome.runtime.sendMessage({
      type: "COMPARE_PARSE_INPUT",
      text,
      ts: _currentSnapshotRef?.ts || "",
      url: _currentSnapshotRef?.url || ""
    });
  }

  submitBtn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

function showCompareOverlay(data) {
  if (!data.success) {
    if (_compareLoadingRef) {
      _compareLoadingRef.content.innerHTML =
        `<div class="cmp-section" style="padding:24px 18px;"><p style="color:#D0021B;font-size:14px;">${escapeHtml(data.error)}</p></div>`;
      _compareLoadingRef = null;
    } else {
      const shadow = createShadowHost();
      const style = document.createElement('style');
      style.textContent = compareStyle;
      shadow.appendChild(style);
      const { popup, content } = createBasePopup("Snapshot Comparison");
      popup.style.height = "auto";
      shadow.appendChild(popup);
      content.innerHTML = `<div class="cmp-section" style="padding:24px 18px;"><p style="color:#D0021B;font-size:14px;">${escapeHtml(data.error)}</p></div>`;
      setupMinimizeBehavior(shadow, popup);
    }
    return;
  }

  const shadow = _compareLoadingRef ? _compareLoadingRef.shadow : createShadowHost();
  const popup = _compareLoadingRef ? _compareLoadingRef.popup : null;
  const content = _compareLoadingRef ? _compareLoadingRef.content : null;
  _compareLoadingRef = null;

  if (popup) popup.style.height = "";

  const dateA = formatCompareDate(data.tsA);
  const dateB = formatCompareDate(data.tsB);
  const added = data.stats?.added ?? 0;
  const removed = data.stats?.removed ?? 0;
  const diff = Array.isArray(data.diff) ? data.diff : [];

  _currentCompareCtx = {
    titleA: data.titleA || "",
    titleB: data.titleB || "",
    tsA: data.tsA,
    tsB: data.tsB,
    url: data.url,
    added,
    removed,
    aiSummary: data.aiSummary || "",
    diffPreview: diff.filter(p => p.type !== "unchanged").slice(0, 80).map(p => `${p.type === "added" ? "+" : "-"} ${p.value}`).join("\n").slice(0, 3000)
  };

  let html = "";

  const showBack = typeof _currentSnapshotRef !== 'undefined' && _currentSnapshotRef;

  html += `
  <div class="cmp-header" style="position: relative; display: flex; flex-direction: column; align-items: center; padding: 16px 18px;">
    
    ${showBack ? `<button class="cmp-back-btn" title="New comparison" aria-label="Go back" style="position: absolute; left: 16px; top: 16px; background: transparent; border: none; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background 0.2s, color 0.2s;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </button>` : ""}

    <div class="cmp-versions">
      <div class="cmp-version"><span class="cmp-date">${dateB}</span></div>
      <span class="cmp-vs">vs</span>
      <div class="cmp-version cmp-current"><span class="cmp-date">${dateA}</span></div>
    </div>
    
    <div class="cmp-stats">
      <span class="cmp-stat cmp-added">+${added} words</span>
      <span class="cmp-stat cmp-removed">-${removed} words</span>
    </div>
    
  </div>
`;

  if (data.aiSummary) {
    html += `<div class="cmp-section">
      <div class="cmp-section-title">AI Summary</div>
      <div class="cmp-ai-summary">${marked.parse(data.aiSummary)}</div>
    </div>`;
  }

  let diffHtml = "";
  const displayDiff = diff.length > 200 ? diff.slice(0, 200) : diff;
  for (const part of displayDiff) {
    if (part.type === "added") {
      diffHtml += `<div class="cmp-line cmp-added"><span class="cmp-sign">+</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "removed") {
      diffHtml += `<div class="cmp-line cmp-removed"><span class="cmp-sign">-</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "unchanged") {
      diffHtml += `<div class="cmp-line cmp-unchanged"><span class="cmp-sign"> </span>${escapeHtml(part.value)}</div>`;
    }
  }

  let fullDiffHtml = "";
  for (const part of diff) {
    if (part.type === "added") {
      fullDiffHtml += `<div class="cmp-line cmp-added"><span class="cmp-sign">+</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "removed") {
      fullDiffHtml += `<div class="cmp-line cmp-removed"><span class="cmp-sign">-</span>${escapeHtml(part.value)}</div>`;
    } else if (part.type === "unchanged") {
      fullDiffHtml += `<div class="cmp-line cmp-unchanged"><span class="cmp-sign"> </span>${escapeHtml(part.value)}</div>`;
    }
  }

  html += `<div class="cmp-section">
    <div class="cmp-section-title">Changes${diff.length > 200 ? ` (showing first 200 of ${diff.length} parts)` : ""} <span class="cmp-expand-btn cmp-diff-expand">⛶</span></div>
    <div class="cmp-diff">${diffHtml}</div>
  </div>`;

  html += `<div class="cmp-section">
    <div class="cmp-section-title">Visual Preview</div>
    <div class="cmp-frames">
      <div class="cmp-frame" data-url="${data.tsB}">
        <div class="cmp-frame-label">${dateB}${data.tsB !== "live" ? ` <span class="cmp-expand-btn" data-ts="${data.tsB}" data-url="${data.url}" data-label="${dateB}">⛶</span>` : ""}</div>
        <div class="cmp-frame-thumb">
          ${data.tsB !== "live"
            ? `<iframe src="https://web.archive.org/web/${data.tsB}if_/${data.url}" sandbox="allow-same-origin" loading="lazy"></iframe>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;font-size:12px;font-weight:600;">Currently Live</div>`}
        </div>
      </div>
      <div class="cmp-frame" data-url="${data.tsA}">
        <div class="cmp-frame-label">${dateA}${data.tsA !== "live" ? ` <span class="cmp-expand-btn" data-ts="${data.tsA}" data-url="${data.url}" data-label="${dateA}">⛶</span>` : ""}</div>
        <div class="cmp-frame-thumb">
          ${data.tsA !== "live"
            ? `<iframe src="https://web.archive.org/web/${data.tsA}if_/${data.url}" sandbox="allow-same-origin" loading="lazy"></iframe>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;font-size:12px;font-weight:600;">Currently Live</div>`}
        </div>
      </div>
    </div>
  </div>`;

  html += `
  <div class="cmp-section cmp-chat-section">
    <div class="cmp-chat-messages" id="cmp-chat-messages"></div>
    <div class="cmp-chat-input-row">
      <input type="text" class="cmp-chat-input" id="cmp-chat-input" placeholder="Ask about these changes...">
      <button class="cmp-chat-send-btn" id="cmp-chat-send-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>`;

  let popupData;
  if (!popup) {
    const style = document.createElement('style');
    style.textContent = compareStyle + cmpChatStyle;
    shadow.appendChild(style);
    popupData = createBasePopup("Snapshot Comparison");
    shadow.appendChild(popupData.popup);
    setupMinimizeBehavior(shadow, popupData.popup);
    popupData.content.innerHTML = html;
    popupData.content.querySelectorAll(".cmp-expand-btn").forEach(btn => {
      if (btn.classList.contains("cmp-diff-expand")) {
        btn.addEventListener("click", () => showCompareDiffModal(shadow, fullDiffHtml, `Changes (${added} added, ${removed} removed)`));
      } else {
        btn.addEventListener("click", () => showCompareFrameModal(shadow, btn.dataset.ts, btn.dataset.url, btn.dataset.label));
      }
    });
    const backBtn = popupData.content.querySelector(".cmp-back-btn");
    if (backBtn) backBtn.addEventListener("click", () => _currentSnapshotRef && showCompareInput(_currentSnapshotRef));
  } else {
    const existingStyle = shadow.querySelector("style");
    if (existingStyle && !existingStyle.textContent.includes("cmp-chat-section")) {
      existingStyle.textContent += "\n" + cmpChatStyle;
    }
    content.innerHTML = html;
    content.querySelectorAll(".cmp-expand-btn").forEach(btn => {
      if (btn.classList.contains("cmp-diff-expand")) {
        btn.addEventListener("click", () => showCompareDiffModal(shadow, fullDiffHtml, `Changes (${added} added, ${removed} removed)`));
      } else {
        btn.addEventListener("click", () => showCompareFrameModal(shadow, btn.dataset.ts, btn.dataset.url, btn.dataset.label));
      }
    });
    const backBtn = content.querySelector(".cmp-back-btn");
    if (backBtn) backBtn.addEventListener("click", () => _currentSnapshotRef && showCompareInput(_currentSnapshotRef));
  }

  const chatContainer = popup ? content : popupData.content;
  if (chatContainer.querySelector("#cmp-chat-input")) {
    const chatKey = `wbm_chat_${data.url}_${data.tsB}_${data.tsA}`;
    chrome.storage.local.get([chatKey], result => {
      const stored = result[chatKey];
      if (stored && stored.initialPrompts) {
        const messagesEl = chatContainer.querySelector("#cmp-chat-messages");
        if (messagesEl) messagesEl.innerHTML = "";
        for (const entry of stored.initialPrompts) {
          if (entry.role === "user" || entry.role === "assistant") {
            appendChatMessage(chatContainer, entry.role === "user" ? "user" : "ai", entry.content);
          }
        }
      }
    });
    setupChatStreaming(chatContainer, () => _currentCompareCtx, "compare");
  }
}

function showCompareFrameModal(shadow, ts, url, label) {
  const existing = shadow.getElementById("cmp-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "cmp-modal";

  const frame = document.createElement("iframe");
  frame.src = `https://web.archive.org/web/${ts}if_/${url}`;
  frame.sandbox = "allow-same-origin";

  const closeBtn = document.createElement("span");
  closeBtn.className = "cmp-modal-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  const header = document.createElement("div");
  header.className = "cmp-modal-header";
  header.textContent = label;

  modal.appendChild(header);
  modal.appendChild(frame);
  modal.appendChild(closeBtn);
  shadow.appendChild(modal);
}

function showCompareDiffModal(shadow, diffHtml, label) {
  const existing = shadow.getElementById("cmp-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "cmp-modal";
  modal.className = "cmp-modal-diff";

  const closeBtn = document.createElement("span");
  closeBtn.className = "cmp-modal-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  const header = document.createElement("div");
  header.className = "cmp-modal-header";
  header.textContent = label;

  const body = document.createElement("div");
  body.className = "cmp-diff-modal-body";
  body.innerHTML = diffHtml;

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(closeBtn);
  shadow.appendChild(modal);
}

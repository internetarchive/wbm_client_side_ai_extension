# Message Protocol

Reference for every message the extension exchanges between its runtime contexts. Each message is a plain JSON object discriminated by a `type` field. Payloads are flattened into the same object (e.g. `{ type, action, targetLanguage }`).

## Transports

| Transport | Between | Notes |
|---|---|---|
| `chrome.runtime.sendMessage` | popup ⇄ background, content ⇄ background | Use `return true;` for async `sendResponse` |
| `chrome.tabs.sendMessage` | background → content (specific tab) | Fire-and-forget, keyed by `sender.tab.id` / `tab.id` |
| `chrome.runtime.sendMessage` | background → offscreen document | `EXTRACT_TEXT` is request/response |

## Conventions

- `background.js` runs **ES modules**, imports: `AISession`, `StorageCleaner`, `cdx`, `wordDiff`, `parseDiff`, etc.
- Content script listens in `content/content.js` and delegates to `content/ui/overlay.js`.
- Popup sends actions with `PERFORM_ACTION`; the background resolves the active tab itself.
- Streaming messages are **cumulative** in the UI: `STREAM_CHUNK` appends to a growing string, `CHAT_STREAM_CHUNK` appends to a per-message bubble.

---

## 1. Feature actions (popup → background)

### `PERFORM_ACTION`
- **Sender:** popup → background
- **Payload:** `{ type: "PERFORM_ACTION", action: "summarize" | "quality" | "compare" | "live-compare" }`
- **Purpose:** Trigger any feature from the popup action cards / more-actions menu. The background looks up the active tab and dispatches to `handleAction` / `handleCompare` / `handleLiveCompare`.

---

## 2. Summarize & Quality pipeline (background → content)

### `STREAM_START`
- **Payload:** `{ type: "STREAM_START", action, targetLanguage }`
- **Purpose:** Create the streaming overlay. `action === "summarize"` shows insights (`showInsights: true`); `"quality"` does not.

### `REQUEST_CONTENT`
- **Payload:** `{ type: "REQUEST_CONTENT", action }`
- **Purpose:** Ask the content script for page data. Routed to `analyzePage()` (content/services/pageAnalyzer.js) → for `summarize` returns extracted text; for `quality` returns timings + text. Reply is via `sendResponse`.

### `STREAM_CHUNK`
- **Sender:** background → content
- **Payload:** `{ type: "STREAM_CHUNK", chunk }`
- **Purpose:** Stream raw AI output (from `aiSession.analyzePage`'s `promptStreaming`) into the overlay's Logs/process area.

### `STREAM_END`
- **Sender:** background → content
- **Payload:** `{ type: "STREAM_END" }`
- **Purpose:** Mark the streaming phase finished (sent on cached-summarize fast path).

### `STREAM_ERROR`
- **Sender:** background → content
- **Payload:** `{ type: "STREAM_ERROR", error }`
- **Purpose:** Surface a streaming-phase error into the Logs area and process list.

### `TRANSLATED_RESULT`
- **Payload:** `{ type: "TRANSLATED_RESULT", action, success, summary, originalSummary, timings?, targetLanguage, screenshot? }`
- **Purpose:** Final result for summarize/quality. Content script renders `marked.parse(summary)` into the summary accordion, `appendQualityTimings(timings)` for quality, and `setScreenshot(screenshot)`.

### `STRUCTURED_INSIGHTS`
- **Payload:** `{ type: "STRUCTURED_INSIGHTS", insights: { faqs, famousPeople }, translatedInsights?, targetLanguage }`
- **Purpose:** Deliver FAQs + famous personalities (summarize only). Rendered by `appendInsights()`.

### `SHOW_RESULT`
- **Payload:** `{ type: "SHOW_RESULT", summary }`
- **Purpose:** Simple non-streaming result overlay — used for error messages like "Not enough content to analyze".

### `TRANSLATE_TEXT` (content → background)
- **Payload:** `{ type: "TRANSLATE_TEXT", text, insights?, targetLanguage, action }`
- **Purpose:** Request on-demand translation of the summary (and optionally insights) when the user switches language tabs.

### `TRANSLATE_TEXT_RESPONSE` (background → content)
- **Payload:** `{ type: "TRANSLATE_TEXT_RESPONSE", translatedText, translatedInsights?, targetLanguage }`
- **Purpose:** Deliver the translated text/insights into the target-language tab.

---

## 3. Compare pipeline

### `COMPARE_SHOW_INPUT` (background → content)
- **Payload:** `{ type: "COMPARE_SHOW_INPUT", url, ts }`
- **Purpose:** Show the natural-language date input overlay (`showCompareInput`). `ts` is the current snapshot's timestamp.

### `COMPARE_PARSE_INPUT` (content → background)
- **Payload:** `{ type: "COMPARE_PARSE_INPUT", text, ts, url }`
- **Purpose:** The user's query, resolved by the background into two timestamps (keyword fast-path or `aiSession.getTimeStamp`).

### `COMPARE_LOADING` (background → content)
- **Payload:** `{ type: "COMPARE_LOADING", error? }`
- **Purpose:** Show the loading overlay (live-compare path).

### `COMPARE_PROGRESS` (background → content)
- **Payload:** `{ type: "COMPARE_PROGRESS", step, status? }`
- **Purpose:** Append a step to the progress list ("Fetching both snapshots…", "Computing word-level diff…", "Cache hit!", etc.).

### `COMPARE_RESULT` (background → content, popup → content)
- **Payload (success):** `{ type: "COMPARE_RESULT", success: true, titleA, titleB, tsA, tsB, diff, stats: { added, removed }, aiSummary, url }`
- **Payload (error):** `{ type: "COMPARE_RESULT", success: false, error }`
- **Purpose:** Deliver the full comparison or an error. The popup's Compare History also sends this message to the active tab to reopen a cached comparison.

---

## 4. Comparison chat

### `CHAT_RESET` (content → background)
- **Payload:** `{ type: "CHAT_RESET" }`
- **Purpose:** Destroy any existing compare-chat session and remove its persisted storage key.

### `CHAT_QUESTION_START` (content → background)
- **Payload:** `{ type: "CHAT_QUESTION_START", context, question, messageId }`
- **Purpose:** Start streaming an answer. `context` carries url, tsA/tsB, titles, add/remove stats, `aiSummary`, and a `diffPreview`. `messageId` correlates chunks/end/error.

### `CHAT_STREAM_CHUNK` (background → content)
- **Payload:** `{ type: "CHAT_STREAM_CHUNK", messageId, chunk }`
- **Purpose:** Append a chunk to the assistant bubble for `messageId`.

### `CHAT_STREAM_END` (background → content)
- **Payload:** `{ type: "CHAT_STREAM_END", messageId, fullText }`
- **Purpose:** Final text for the bubble (`fullText` is `""` when the stream was aborted). Content renders markdown here.

### `CHAT_STREAM_ERROR` (background → content)
- **Payload:** `{ type: "CHAT_STREAM_ERROR", messageId, error }`
- **Purpose:** Render an inline error for the message.

### `CHAT_STOP` (content → background)
- **Payload:** `{ type: "CHAT_STOP", messageId }`
- **Purpose:** Abort the in-flight `AbortController` for `messageId`; partial text is preserved with a `[stopped]` marker.

---

## 5. Offscreen document

### `EXTRACT_TEXT` (background → offscreen)
- **Payload:** `{ type: "EXTRACT_TEXT", html }`
- **Purpose:** Offscreen parses `html` and runs Readability, replying with `{ type: "EXTRACT_TEXT_RESPONSE", title, textContent }`. Used by the compare pipeline so Readability never runs in the visible tab.

---

## 6. Message flow per feature (quick recap)

**Summarize:** `PERFORM_ACTION` / context-menu → `STREAM_START` → `REQUEST_CONTENT` (+reply) → `STREAM_CHUNK`* → `TRANSLATED_RESULT` + `STRUCTURED_INSIGHTS` → optional `TRANSLATE_TEXT`/`TRANSLATE_TEXT_RESPONSE`.

**Quality:** same skeleton, but `REQUEST_CONTENT` returns timings, prompt includes HTTP status + optional screenshot, and result carries `timings` + `screenshot` (never cached).

**Compare:** `COMPARE_SHOW_INPUT` → `COMPARE_PARSE_INPUT` → `COMPARE_LOADING`/`COMPARE_PROGRESS`* → `COMPARE_RESULT` → chat via `CHAT_RESET`, `CHAT_QUESTION_START`, `CHAT_STREAM_CHUNK`*, `CHAT_STREAM_END`/`CHAT_STREAM_ERROR`, `CHAT_STOP`.

**Live compare:** `PERFORM_ACTION("live-compare")` → `COMPARE_LOADING` → `COMPARE_PROGRESS`* → `COMPARE_RESULT`.

`*` = repeated zero or more times.

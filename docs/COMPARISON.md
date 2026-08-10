# Feature: Snapshot Comparison

This document describes the **Compare** feature of the Wayback Machine Client-Side AI Extension. It covers natural-language date parsing, snapshot fetching, word-level diffing, AI summarization of changes, and the follow-up chat with a live archive-aware assistant.

---

## 1. Overview

The Compare feature lets a user pick **two archived snapshots** of the same URL and see:

1. A **word-level diff** between the two page texts, computed locally with an LCS-based diff engine (`utils/diff.js`) — no server-side diffing.
2. An **AI summary of the changes**, generated on-device by Gemini Nano (`summarizeChanges`).
3. A **chat** with a session-scoped AI assistant that knows the exact snapshot dates, titles, diff stats, and diff preview — and answers questions about *what changed*.
4. **Visual previews** of both versions (embedded iframes) and a **Compare History** list in the popup.

There are two entry paths:

- **Compare Snapshots** — compares two *archived* versions (natural-language input, e.g. "compare with the oldest version").
- **Live Compose** — compares the *live* page against its most recent archived version (from the extension popup).

---

## 2. Triggering the feature

### 2.1 Compare two archived snapshots

1. Open an archived page on `web.archive.org` (this snapshot becomes the "current" timestamp).
2. Right-click → **Wayback Machine AI Helper → Compare Snapshots**, **or** open the popup → **More Actions → Compare Snapshots** (sends `PERFORM_ACTION` with `action: "compare"`).
3. `handleCompare(tab)` parses the playback URL (`utils/helpers.js` `parsePlaybackUrl`) and sends `COMPARE_SHOW_INPUT` to the content script, which renders the natural-language input overlay (`showCompareInput`).
4. Type a query and press Submit. The query is resolved into two timestamps:
   - **Keyword fast-path** — "first/oldest/initial/earliest" → `cdx.getFirstCapture(url)`; "last/latest/newest" → `cdx.getLastCapture(url)`.
   - **AI path** — anything else → `aiSession.getTimeStamp(ts, query)` (ai/utility.js `CompareSessionInit`), which returns two 14-digit timestamps (`YYYYMMDDHHMMSS`) via a JSON-constrained response. The system prompt says: *"Convert the user's request into EXACTLY TWO 14-digit Wayback Machine timestamps."*
5. Timestamps are made chronological (`tsA < tsB`, swapped if needed). `tsA === tsB` produces an error: *"This is the first snapshot that you have opened!"*

### 2.2 Live compare

From the popup on a *non-archive* page: **More Actions → Compare with latest archive →** sends `PERFORM_ACTION` with `action: "live-compare"` → `handleLiveCompare(tab)`:

- If the active tab is itself a playback page, it routes to `handleCompare` (normal compare).
- Otherwise it sends `COMPARE_LOADING` (loading overlay), resolves the latest capture via `cdx.getLastCapture(liveUrl)`, extracts the live page text via the content script (`REQUEST_CONTENT`), fetches the archived HTML (`/web/<ts>id_/<url>`), and runs the same diff+summarize pipeline. Results are cached under `wbm_compare_<url>_live_<archiveTs>`.

---

## 3. The core pipeline (background.js, `COMPARE_PARSE_INPUT`)

After timestamps resolve, both paths share this pipeline:

1. `COMPARE_PROGRESS` messages update the loading overlay ("Fetching both snapshots…", "Extracting page text via Readability…", "Computing word-level diff…").
2. **Fetch** both snapshot HTMLs in parallel from `https://web.archive.org/web/<ts>id_/<url>` (the `id_` modifier returns the original, unmodified page). The current tab's snapshot is *not* reused — both are fetched fresh so extraction is symmetric.
3. **Offscreen extraction** — `ensureOffscreenDocument()` loads `offscreen/offscreen.js`, and `extractTextViaOffscreen(html)` sends `EXTRACT_TEXT` to it. The offscreen document parses the HTML and runs **Readability** to produce a clean `{ title, textContent }`. This keeps Readability parsing out of the visible page context.
4. **Diff** — `wordDiff.diff(cleanA.textContent, cleanB.textContent)` (utils/diff.js) tokenizes both texts into words (regex `/\S+\s*/g`), computes the **LCS** with a `Uint32Array` DP table, and backtracks to emit chunks of `{ type: "added" | "removed" | "unchanged", value }`.
5. **Stats** — `parseDiff(diff)` (utils/helpers.js) yields `addedCount`, `removedCount`, and `diffLines` (the added/removed lines).
6. **AI summary** — if AI is available, `aiSession.summarizeChanges({ before: cleanA.title, after: cleanB.title }, diffLines)` asks the model to summarize what changed between the two versions. The summary is generated **even when the diff is empty** — in that case the prompt states *"No textual content differences were detected"* and the model surfaces things like a title change.
7. **Cache** — the whole result is stored under `wbm_compare_<url>_<tsA>_<tsB>` (or `wbm_compare_<url>_live_<archiveTs>`), including `titleA`, `titleB`, `diff`, `stats`, `aiSummary`, `timestamp`. A cache hit (checked right after timestamp resolution) short-circuits the fetch/diff/AI work.
8. **`COMPARE_RESULT` (success)** → `showCompareOverlay(data)` (content/ui/overlay.js).

---

## 4. The comparison overlay

`showCompareOverlay` renders:

- **Header** — Version A (older, `formatCompareDate(tsA)`) vs Version B (newer), and **+added / −removed** counts.
- **AI Summary accordion** — the `aiSummary`, rendered through `marked.parse`.
- **Changes section** — the diff lines (limited to the first ~200); the diff is shown as `+`/`-` lines, with visual grouping into consecutive change blocks.
- **Visual Preview** — two iframes (`/web/<ts>/<url>`) so the user can eyeball the actual renders.
- **Chat** — a conversational assistant scoped to this comparison (see §5).

---

## 5. The comparison chat

### 5.1 Session setup

When the user sends their first message:

1. The overlay sends `CHAT_QUESTION_START` with `{ context, question, messageId }`. `context` contains the URL, both timestamps, titles, add/remove stats, the AI summary, and a ~3000-char `diffPreview` (up to 80 added/removed lines).
2. The background computes `sessionKey = wbm_chat_<url>_<tsB>_<tsA>`. If the current `aiSession.compareChatKey` differs, it destroys the old session and calls `compareChatInit(sessionKey, context)` (ai/utility.js), which seeds a fresh `LanguageModel.create()` session with a **system prompt** containing:

   - The exact archived dates of both versions, formatted with `formatDate` (e.g. **Version A (newer, April 27, 2005)**).
   - A strict rule: *"Never invent or alter these dates — use exactly the dates provided above."* (Fixed a bug where the model hallucinated dates like `2020-04-27`.)
   - Titles, diff statistics, the AI summary, and the diff preview.

3. Chat history for the session is stored under `wbm_chat_<url>_<tsB>_<tsA>` and reloaded on overlay open, so a conversation survives page reloads.

### 5.2 Streaming + stop

- Each user question starts a **new stream** with an `AbortController` registered in `_chatStreamControllers[messageId]` (background.js).
- `compareChatStream(message, onChunk, signal)` (ai/utility.js) calls `promptStreaming(message, { signal })` and forwards every chunk as `CHAT_STREAM_CHUNK` → the overlay appends it to the assistant bubble.
- While waiting for the first chunk, the bubble shows an animated `.thinking-dots` indicator.
- The send button becomes a **stop (■)** button while streaming. Pressing it sends `CHAT_STOP` → background aborts the controller → the model call throws `AbortError` → the overlay receives `CHAT_STREAM_END` with `fullText: ""` and the partial text is preserved with a `[stopped]` marker.
- On success, `CHAT_STREAM_END` delivers the full text, which the overlay renders with `marked.parse` (markdown support: lists, code, headings, links, blockquotes).
- On any other failure, `CHAT_STREAM_ERROR` renders an inline error bubble.
- Message history is appended to `compareChatHistory` and persisted to storage on both success and abort.

---

## 6. Message map

| Message | Direction | Purpose |
|---|---|---|
| `PERFORM_ACTION` (compare / live-compare) | popup → background | Trigger compare from the popup |
| `COMPARE_SHOW_INPUT` | background → content | Render the natural-language date input |
| `COMPARE_PARSE_INPUT` | content → background | Resolve the user query into two timestamps |
| `COMPARE_LOADING` / `COMPARE_PROGRESS` | background → content | Loading overlay + progress steps |
| `COMPARE_RESULT` | background → content | Deliver diff, stats, summary (or error) |
| `CHAT_QUESTION_START` | content → background | Begin a streamed chat answer; re-inits the session if the key changed |
| `CHAT_STREAM_CHUNK` | background → content | Streamed chat chunks |
| `CHAT_STREAM_END` | background → content | Final chat text (or empty when stopped) |
| `CHAT_STREAM_ERROR` | background → content | Chat failure |
| `CHAT_STOP` | content → background | Abort the active stream |
| `EXTRACT_TEXT` | background → offscreen | Readability extraction of fetched HTML |

---

## 7. Key files

| File | Responsibility |
|---|---|
| `background.js` | `handleCompare`, `handleLiveCompare`, `COMPARE_PARSE_INPUT` pipeline, chat streaming + AbortController map, caching |
| `content/ui/overlay.js` | `showCompareInput`, `showCompareLoading`, `showCompareOverlay`, chat UI (thinking dots, stop button, markdown), `_pendingStreamMsgs` |
| `content/ui/base-popup.js` / `content/ui/styles.js` | Overlay shell + `compareStyle` |
| `utils/diff.js` | `WordDiffEngine` — LCS word diff |
| `utils/helpers.js` | `parsePlaybackUrl`, `parseDiff`, `formatDate`, `formatCompareDate` |
| `offscreen/offscreen.js` | `EXTRACT_TEXT` — Readability on background-fetched HTML |
| `ai/utility.js` | `CompareSessionInit`/`getTimeStamp`, `summarizeChanges`, `compareChatInit`/`compareChatStream`/`destroyCompareChat` |
| `api/cdx.js` | `getFirstCapture`, `getLastCapture` |
| `popup/popup.js` | Compare History list, live-compare action |

---

## 8. Edge cases & notes

- **`tsA === tsB`**: the user tried to compare a snapshot with itself → friendly error.
- **Keyword misses** ("Could not find the oldest/latest snapshot"): no fallback is attempted.
- **Cache hit**: skips fetch/diff/AI entirely; the stored `diff`, `stats`, and `aiSummary` are served as-is.
- **Zero diff**: AI still summarizes (title change, identical content message); this was fixed by removing the `if (diffLines && ...)` guard.
- **Date hallucination**: the chat system prompt pins exact dates and forbids inventing them; this was fixed by importing `formatDate` into the prompt construction.
- **Stop mid-stream**: partial text is preserved with a `[stopped]` marker and persisted to history.
- **Offscreen document**: created on demand, closed after extraction (`chrome.offscreen.closeDocument()`), so Readability never runs in the visible tab.
- **Chat session lifetime**: one session per `(url, tsA, tsB)`; switching comparisons destroys the previous session and its persisted key.

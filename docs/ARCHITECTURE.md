# Architecture

This document explains how the **Wayback Machine Client-Side AI Extension** is structured — the isolated runtime contexts, the communication model between them, the overlay UI pattern, and the directory layout.

---

## 1. High-level picture

The extension is a **Manifest V3** Chrome extension. All AI work happens **on-device** via the built-in Gemini Nano APIs (Prompt, Language Detector, Translator). The extension never sends page content to an external LLM — the only network calls are to `web.archive.org` for snapshot metadata/HTML (via the CDX API) and the captured snapshots themselves.

Four runtime contexts participate:

```
┌─────────────────────┐   chrome.runtime.sendMessage / chrome.tabs.sendMessage
│  Background service │◀───────────────────────────────┐
│  worker (MV3)       │                                │
│  background.js      │                                │
└─────┬──────────┬────┘                                │
      │          │                                     │
      ▼          ▼                                     ▼
┌──────────┐ ┌──────────────┐   ┌──────────────────────────┐
│ Offscreen │ │ Content script│  │ Popup                    │
│ document  │ │ (per tab)     │  │ popup/popup.html         │
│ offscreen │ │ content.js    │  │                          │
│           │ │ + ui/ +       │  │ action cards, health,    │
│ Readability│ │ services/    │  │ timeline, trend, history  │
└──────────┘ └──────────────┘  └──────────────────────────┘
```

| Context | When it lives | Responsibilities |
|---|---|---|
| **Background service worker** | Started on demand (MV3) | Context menus, message routing, AI orchestration, CDX lookups, caching, screenshot capture, offscreen doc management |
| **Content script** | Injected into every tab (`<all_urls>`) | DOM/Readability extraction, page-timing collection, renders all overlays (summary/quality/compare/chat) |
| **Offscreen document** | Created on demand (compare only) | Parses background-fetched HTML with Readability (`EXTRACT_TEXT`) |
| **Popup** | On toolbar-icon click | Action cards, language selector, health card, timeline, evolution-trend chart, compare history, live-compare |

---

## 2. Manifest essentials (manifest.json)

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "scripting", "contextMenus", "storage", "offscreen"],
  "host_permissions": ["*://web.archive.org/*"],
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": [ ... ] }]
}
```

- **`<all_urls>`** content script — the extension must operate on both `web.archive.org` playback pages *and* live pages (for live-compare), so the script runs everywhere but only activates its UI on relevant pages.
- **`offscreen`** permission — required to host the offscreen document for background HTML→text extraction.
- **`activeTab`/`scripting`** — used for screenshot capture and programmatic extraction where needed.
- **`type: "module"`** service worker — the background imports `ai/utility.js`, `utils/*`, `api/cdx.js` as ES modules.

---

## 3. Directory layout

```
.
├── manifest.json              # MV3 manifest
├── background.js              # Service worker: routing, orchestration, caching
├── ai/
│   ├── utility.js             # AISession class — all Gemini Nano interactions
│   └── storageCleaner.js      # Daily eviction of expired wbm_* storage entries
├── api/
│   └── cdx.js                 # CDX API wrapper (retries/backoff, first/last capture, status)
├── content/
│   ├── content.js             # Content-script message router
│   ├── lib/                   # Third-party (Readability.js, marked.min.js)
│   ├── services/
│   │   ├── contentExtractor.js# Readability + fallback text extraction
│   │   └── pageAnalyzer.js    # Routes REQUEST_CONTENT → timings or extraction
│   ├── ui/
│   │   ├── base-popup.js      # Shared popup shell (shadow host, header, resize)
│   │   ├── shadow-dom.js      # Shadow-DOM host creation
│   │   ├── resizable.js       # Drag-to-resize behaviour
│   │   ├── overlay.js         # Streaming/comparison/insights/chat UI
│   │   ├── quality-popup.js   # Quality timings + HTTP-status badge UI
│   │   └── styles.js          # hostStyle + compareStyle (shadow CSS)
│   └── utils/
│       └── pageTimings.js     # performance.getEntriesByType aggregation
├── offscreen/
│   └── offscreen.js           # EXTRACT_TEXT: Readability on fetched HTML
├── popup/
│   ├── popup.html/js/css      # Toolbar popup UI
├── utils/
│   ├── diff.js                # WordDiffEngine (LCS word diff)
│   ├── helpers.js             # formatDate, parsePlaybackUrl, parseDiff, ...
│   └── pageLoader.js          # waitForPageLoad helper
├── Public/                    # 200.jpeg / 404.jpeg verdict badges
└── docs/                      # Feature + architecture documentation
```

---

## 4. Communication model

Messages are plain JSON objects with a `type` discriminator. See [MESSAGE_PROTOCOL.md](./MESSAGE_PROTOCOL.md) for the full reference.

| Transport | Used between | Direction |
|---|---|---|
| `chrome.runtime.sendMessage` | popup ⇄ background, content ⇄ background | Bidirectional, `sendResponse` callback |
| `chrome.tabs.sendMessage` | background → content script of a specific tab | One-way fire-and-forget (no response awaited) |
| `chrome.offscreen.*` (runtime messages to offscreen doc) | background → offscreen | Request/response |

Key patterns:

- **Background → tab streaming**: the background drives long-running AI work and pushes incremental results with `chrome.tabs.sendMessage` (e.g. `STREAM_CHUNK`, `COMPARE_PROGRESS`, `CHAT_STREAM_CHUNK`). The content script just renders.
- **Content → background request/response**: interactive requests (e.g. `CHAT_QUESTION_START`, `COMPARE_PARSE_INPUT`, `TRANSLATE_TEXT`) use `chrome.runtime.sendMessage` with `return true;` to keep the channel open while async work completes.
- **Content-script listeners** in `content.js` are a thin router: each `request.type` is delegated to a function in `ui/overlay.js` (e.g. `showCompareOverlay`, `createStreamingOverlay`, `appendStreamChunk`).

---

## 5. Overlay UI pattern

All analysis results are displayed in the **top-right of the archived page** inside an iframe-free Shadow DOM overlay injected by the content script:

1. `createShadowHost()` (shadow-dom.js) — creates the host element and attaches a closed shadow root.
2. `createBasePopup(title)` (base-popup.js) — builds the shell: header (title, minimize/close), body, footer.
3. Styles are injected as a `<style>` inside the shadow root using `hostStyle` / `compareStyle` (styles.js) — the overlay is fully isolated from page CSS.
4. `resizable.js` adds a drag handle; the extension stores/restores the overlay bounds in `chrome.storage.local`.

Overlays created:

| Overlay | Function | Shown for |
|---|---|---|
| Streaming overlay | `createStreamingOverlay(action, lang, showInsights)` | Summarize & Quality |
| Result overlay | `showResultOverlay(summary)` | Simple text results / errors |
| Compare input | `showCompareInput(...)` | Natural-language date query |
| Compare loading | `showCompareLoading(...)` | Compare pipeline progress |
| Compare overlay | `showCompareOverlay(data)` | Diff + AI summary + previews + chat |

---

## 6. Feature entry points

All features share two triggers: a **context menu** item (registered in `background.js` `onInstalled` under the parent `wbm-parent`) and a **popup action card** (sends `PERFORM_ACTION`).

| Feature | Context menu | Popup card | Background entry |
|---|---|---|---|
| Summarize | Summarize Page | Summarize | `handleAction("summarize", tab)` |
| Quality | Check page quality | Quality | `handleAction("quality", tab)` |
| Compare | Compare Snapshots | More Actions → Compare Snapshots | `handleCompare(tab)` |
| Live compare | — | More Actions → Compare with latest archive | `handleLiveCompare(tab)` |

See the feature docs for the end-to-end flows:
- [SUMMARY.md](./SUMMARY.md)
- [QUALITY.md](./QUALITY.md)
- [COMPARISON.md](./COMPARISON.md)

---

## 7. Startup & background lifecycle

1. On install, `onInstalled` fires → `chrome.contextMenus.removeAll()` (prevents duplicate-ID errors on reinstall) then registers `wbm-parent` and its children (`summarize`, `quality`, `compare`).
2. `storageCleaner` is instantiated at startup (`new StorageCleaner()`), which schedules a 24-hour sweep of expired `wbm_*` cache entries.
3. The background **lazily initializes** AI sessions on first use (`aiSession.init()`), so a browser that lacks Gemini Nano still loads the extension and shows graceful errors.

---

## 8. Key design decisions

- **All AI is on-device** — text, image, and translation models all run in the browser via the Prompt API / Translator API / Language Detector API.
- **Extraction is symmetric** — the compare pipeline always re-fetches both snapshots and parses them through the same offscreen Readability path, so the diff compares like-for-like.
- **Background does the heavy lifting** — fetching, diffing, AI streaming happen in the service worker; content scripts only extract (DOM/timings) and render.
- **Caching with TTL** — summaries, insights, comparisons, and chat history are cached in `chrome.storage.local` under `wbm_*` keys; `StorageCleaner` evicts entries older than 1 day.
- **Session isolation** — long-running analyses use `session.clone()` so parallel features never share context (see [AI_SESSIONS.md](./AI_SESSIONS.md)).

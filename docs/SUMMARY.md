# Feature: Page Summarization

This document describes the **Summarize** feature of the Wayback Machine Client-Side AI extension. It covers how the feature works end-to-end, which files are involved, and how the data flows between the background service worker, content script, and the on-device AI.

---

## 1. Overview

The Summarize feature generates a concise **2–3 sentence summary** of an archived web page directly in the browser using the **on-device Gemini Nano** model (the built-in Prompt API). No page content ever leaves the machine. In addition to the summary, the feature extracts **structured insights** — interesting FAQ questions and notable personalities mentioned on the page — and renders them in an accordion-style UI.

The feature also supports **live translation**: if the user has selected a non-English target language in the extension popup, the summary and insights are translated on-device using the built-in Translator API.

---

## 2. How the user triggers it

1. Open any archived page (e.g. `https://web.archive.org/web/20240101120000/https://example.com`).
2. Right-click anywhere on the page → **Wayback Machine AI Helper → Summarize Page**.
3. Alternatively, click the extension toolbar icon and press the **Summarize** action card.

The result overlay appears in the top-right corner of the page with:
- A **Summary** tab containing the generated summary.
- A **translated-language tab** (only if a non-English target language is configured).
- A **Logs** tab showing the streaming raw output and processing steps.
- An **Insights** section with collapsible FAQ items and famous-personality chips.

---

## 3. Entry point & routing

### Context menu (background.js)

The context menu item `summarize` is registered under the parent `wbm-parent`:

```
contextMenus.create({ id: "summarize", parentId: "wbm-parent", title: "Summarize Page", contexts: ["page"] })
```

`contextMenus.onClicked` forwards the `menuItemId` to `handleAction(action, tab)`.

### Popup action card (popup/popup.js)

The popup's Summarize card sends a `PERFORM_ACTION` message with `action: "summarize"` and the active `tabId`. The background listener looks up the tab and calls `handleAction("summarize", tab)`.

Both paths converge on `handleAction(action, tab)` in `background.js`.

---

## 4. Pre-flight checks

Before doing any AI work, `handleAction` validates the tab:

| Check | Function | Failure message shown |
|---|---|---|
| Page is a playback page (`web.archive.org/web/*`) | `isPlaybackPage(tab.url)` | "This page is not a valid archive. Please navigate to a specific snapshot." |
| Browser exposes the built-in Prompt API | `isBrowserSupported()` (`typeof LanguageModel !== "undefined"`) | "Built-in AI is not supported in this browser." |
| Model is downloaded & ready | `checkAIAvailability()` (`LanguageModel.availability()` not `unavailable`/`downloadable`) | "Built-in AI is not supported." |

The target language is read from `chrome.storage.sync` (`targetLanguage`, default `"en"`).

---

## 5. Caching

Summarize results are cached in `chrome.storage.local` under:

```
wbm_summarize_<page-url>_<target-language>
```

- On a cache **hit**, the overlay is created and the cached summary (`TRANSLATED_RESULT`) plus cached insights (`STRUCTURED_INSIGHTS`) are served instantly — no AI call is made.
- On a **miss**, the result is stored after generation (only on success), with a `timestamp` field.
- Insights are cached separately under `wbm_insights_<page-url>_<target-language>`.
- The `StorageCleaner` (`ai/storageCleaner.js`, instantiated at startup) runs a sweep once per 24h and evicts every `wbm_*` entry older than **1 day** (`runSweep(1)`).

---

## 6. Step-by-step flow

### 6.1 Start the streaming overlay

`handleAction` sends `STREAM_START` to the content script:

```js
chrome.tabs.sendMessage(tab.id, { type: "STREAM_START", action, targetLanguage });
```

The content script (`content/content.js`) calls `createStreamingOverlay(action, targetLanguage, showInsights)` (content/ui/overlay.js), which builds the tabbed overlay (Summary / translated tab / Logs) and wires up the accordion toggles. `showInsights` is `true` for summarize.

### 6.2 Extract page content

`handleAction` sends `REQUEST_CONTENT` with `action: "summarize"`. The content script's `analyzePage(sendResponse, action)` (content/services/pageAnalyzer.js) calls `extractPageContent()` (content/services/contentExtractor.js), which:

1. Clones the DOM and removes the Wayback toolbar (`#wm-ipp-base`).
2. Runs **Mozilla Readability.js** on the clone.
3. If successful and the extracted text is longer than 100 chars, prefixes the article title and returns up to **4000 chars**.
4. Otherwise falls back to a manual extraction that concatenates `article`, `main`, `p` elements (or `document.body.innerText`).

If fewer than 100 chars are extracted, a "Not enough content to analyze" result overlay is shown and the request aborts.

### 6.3 Generate the summary (background)

The background calls `aiSession.analyzePage(...)` (ai/utility.js):

- Ensures the shared main session exists (`init()`).
- Creates a lightweight **clone** of the session via `session.clone()` so the main session is untouched.
- Builds the prompt: `"Summarize this archived web page in 2-3 sentences: {pageContent}"`.
- Calls `promptStreaming(promptInput, streamOptions)` and, for every chunk, forwards a `STREAM_CHUNK` message to the tab. The content script's `appendStreamChunk()` streams the raw text into the **Logs** tab (which also drives the process-step list).
- If `targetLanguage` is set and not `"en"`, the finished summary is translated with `translateResult()` and the result object carries both `summary` (translated) and `originalSummary` (English).

### 6.4 Structured insights (parallel)

While the summary streams, `getStructuredInsights(pageContent)` runs in parallel (via `Promise.all`):

- Uses a dedicated `insightSession` (initialized from `init()`).
- Sends a prompt asking for 3–5 FAQs and 2–4 famous people, constrained with a strict **JSON schema** (`responseConstraint`).
- Parses the response and returns `{ faqs: [...], famousPeople: [...] }`.

### 6.5 Render results

The background sends `TRANSLATED_RESULT`:

- `content.js` populates the **Summary** accordion with `marked.parse(summary)` and marks process steps as complete.
- The result is cached under `wbm_summarize_...` (summarize only — quality results are intentionally not cached).

If insights were produced, the background sends `STRUCTURED_INSIGHTS`:

- `appendInsights()` renders FAQ items (click-to-expand) and famous-personality chips with hover tooltips linking to Wikipedia.
- If a translation is needed, `translateInsights()` is called first and the English originals are kept for the tooltips.
- Insights are cached under `wbm_insights_...`.

### 6.6 Translation flow (when a non-English target language is set)

- The overlay renders an extra tab for the target language and a `<select>` to switch languages on the fly.
- Switching tabs triggers a `TRANSLATE_TEXT` message to the background, which uses the **Language Detector** + **Translator** APIs:
  - `LanguageDetector.create()` detects the source language.
  - `Translator.create({ sourceLanguage, targetLanguage })` translates line-by-line.
- The background replies with `TRANSLATE_TEXT_RESPONSE`, and the content script fills the target-language tab.

---

## 7. Message map

| Message | Direction | Purpose |
|---|---|---|
| `PERFORM_ACTION` | popup → background | Trigger summarize from the popup |
| `STREAM_START` | background → content | Create the streaming overlay |
| `REQUEST_CONTENT` | background → content | Ask for extracted page text |
| `STREAM_CHUNK` | background → content | Stream the raw AI output into Logs |
| `TRANSLATED_RESULT` | background → content | Deliver the (possibly translated) summary |
| `STRUCTURED_INSIGHTS` | background → content | Deliver FAQs + famous people |
| `TRANSLATE_TEXT` / `TRANSLATE_TEXT_RESPONSE` | content ⇄ background | On-demand language switching |

---

## 8. Key files

| File | Responsibility |
|---|---|
| `background.js` | `handleAction("summarize")`, caching, orchestration |
| `content/content.js` | Content-script message router for overlay events |
| `content/services/contentExtractor.js` | Readability.js + fallback text extraction (4000-char cap) |
| `content/services/pageAnalyzer.js` | `analyzePage()` — routes to extraction / timing collection |
| `content/ui/overlay.js` | `createStreamingOverlay()`, `appendStreamChunk()`, `appendInsights()` |
| `content/ui/styles.js` | Overlay styling (`hostStyle`) |
| `ai/utility.js` | `analyzePage()`, `getStructuredInsights()`, `translateResult()`, `translateInsights()` |
| `ai/storageCleaner.js` | Daily eviction of expired `wbm_*` cache entries |

---

## 9. Edge cases & notes

- **Empty page**: content under 100 chars → "Not enough content to analyze" overlay.
- **AI unavailable**: blocked by the pre-flight availability check with a friendly message.
- **Screenshot caching**: summarize results are cached without any screenshot (screenshots only apply to Quality).
- **Cache eviction**: all cached summaries/insights expire after 1 day via `StorageCleaner`.
- **Translation failure**: `translateResult()` and `translateInsights()` degrade gracefully to the original English text.
- **Session isolation**: the summary uses a `clone()` of the main session, so repeated analyses never poison each other's context.

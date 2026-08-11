# Feature: Page Quality Analysis

This document describes the **Quality** feature of the Wayback Machine Client-Side AI Extension. It covers the end-to-end flow, the data sources (load timings, HTTP status, screenshot), and how the on-device AI produces a structured verdict.

---

## 1. Overview

The Quality feature answers two questions about an archived web page:

1. **Is this page showing an error?** — real error page, **soft-404** (a page that returns HTTP 200 but has no real content), or normal.
2. **Is the content complete?** — fully captured, or truncated/broken?

It combines three signals that are computed entirely on-device and in the browser tab, then hands them to the on-device Gemini Nano model:

| Signal | Source |
|---|---|
| **Load timing stats** | `performance.getEntriesByType()` collected by `pageTimings.js` in the content script |
| **HTTP status** | CDX API (`api/cdx.js`) |
| **Page screenshot** (optional) | `chrome.tabs.captureVisibleTab()` from the background service worker |

The model's answer is constrained to a **JSON schema** so the extension can render a structured QA verdict with badges, resource-budget bars, and a screenshot preview. Quality results are **not cached** — each analysis re-runs intentionally, so the timings and verdict reflect the current render.

---

## 2. How the user triggers it

1. Open any archived page on `web.archive.org`.
2. Right-click → **Wayback Machine AI Helper → Check page quality**.
3. Or open the extension popup and press the **Quality** action card.

The overlay shows:
- A **Summary** accordion with the AI's verdict (rendered as Q&A with 🛑 / 📄 / 🖼️ icons).
- A **Screenshot** accordion with the captured page thumbnail.
- A **Logs** tab with the raw streamed output.
- A **Page Quality** section (`qualityPopup`) with resource counts, render-blocking warning, top scripts/stylesheets with load durations, and an HTTP status badge.

---

## 3. Entry point & routing

Like Summarize, the Quality feature is routed through `handleAction("quality", tab)` in `background.js` from either:
- the context menu item `quality` (registered under `wbm-parent`), or
- the popup action card (sends `PERFORM_ACTION` with `action: "quality"`).

Pre-flight checks are identical to Summarize: `isPlaybackPage`, `isBrowserSupported`, `checkAIAvailability`.

**Note:** `targetLanguage` is forced to `"en"` for quality — the verdict and timing UI are always rendered in English.

---

## 4. Data collection

### 4.1 Screenshot (background)

Before analysis, `handleAction` calls `chrome.tabs.captureVisibleTab({ format: 'png' })` and converts the data URL into a `Blob`. This succeeds only if the tab is visible (e.g. not minimized/backgrounded); on failure the analysis simply proceeds **without** a screenshot.

### 4.2 Page content & timings (content script)

`handleAction` sends `REQUEST_CONTENT` with `action: "quality"`. The content script's `analyzePage(sendResponse, "quality")` (content/services/pageAnalyzer.js) calls `getPageTimings()` (content/utils/pageTimings.js), which walks `performance.getEntriesByType('resource')` and aggregates:

- `totalResources` — total resource count.
- `renderBlockingCount` — render-blocking stylesheet/script entries.
- `scripts` / `stylesheets` — arrays of `{ name, duration }` for the slowest entries.
- `pageTiming` — navigation timing summary (DOMContentLoaded, fully loaded, etc.).

These are serialized into a `timingSummary` string and passed to the AI.

### 4.3 HTTP status (background)

`cdx.getSnapshotStatus_quality(tab.url)` queries the CDX API and classifies the snapshot:

| Status | Meaning |
|---|---|
| `confirmed` | Direct snapshot; the CDX HTTP `statuscode` is available (`codes[0]`). |
| `chain` | The snapshot is part of a redirect chain; codes are shown as `301 → 200`. |
| `unrecorded` / `unavailable` | No snapshot data — the badge shows a warning state. |

The status line (e.g. `HTTP Status: 200` or `HTTP Status chain: 301 → 200`) is appended to the AI prompt.

---

## 5. AI analysis (ai/utility.js — `analyzePage`)

For `action === "quality"`:

1. A `qualitySchema` is defined:

   ```js
   { type: "object", properties: { errorStatus: { type: "string" }, contentCompleteness: { type: "string" } }, required: ["errorStatus", "contentCompleteness"], additionalProperties: false }
   ```

   If a screenshot is present, `screenshotQuality` is added to the schema.

2. The prompt is multimodal when a screenshot exists — the model receives `{ type: "image", value: screenshotBlob }` **plus** the text prompt asking about error status, content completeness, and screenshot quality. Without a screenshot, only the text prompt is sent.

   The prompt explicitly tells the model that **HTTP 200 does not rule out a soft-404** — it must inspect the body for signs like very short/generic text, "not found" messaging, empty bodies, or placeholder/search results.

3. `promptStreaming(promptInput, { responseConstraint: qualitySchema })` streams the JSON response; each chunk is forwarded as `STREAM_CHUNK` to the content script's Logs tab.

4. The final text is parsed with `JSON.parse`. The QA items are rendered into HTML:

   - `errorStatus` → 🛑 question, with a **200.jpeg** badge if normal, or **404.jpeg** badge if it detects error/404/soft-404/not-found/blank.
   - `contentCompleteness` → 📄 question.
   - `screenshotQuality` → 🖼️ question (only when a screenshot was analyzed).

   If parsing fails, the raw text is kept as the summary and the overlay shows the unparsed output.

---

## 6. Rendering the result

The background sends `TRANSLATED_RESULT` with `action: "quality"`, `timings`, and the `screenshot` data URL:

- `populateTab("en", summaryHtml)` — renders the QA verdict into the Summary accordion.
- `appendQualityTimings(timings)` — builds the **Page Quality** section (`content/ui/quality-popup.js`):
  - A **status badge** (`statusBadge(snapshotStatus)`) colored by HTTP status:
    - 2xx → green "OK", 3xx → amber "Redirect", 4xx/5xx → red "Not Found"/"Server Error", plus chain/unavailable states.
  - Resource summary bars (total resources, render-blocking, scripts, stylesheets, images).
  - Top-5 slowest scripts and stylesheets with durations.
  - Navigation timing (DOMContentLoaded, fully loaded).
- `setScreenshot(screenshotDataUrl)` — fills the Screenshot accordion.

The model's verdict **does not** modify the HTTP-status badge; the badge reflects the actual CDX statuscode, and the AI text lives alongside it, so a soft-404 is surfaced by the AI even when the badge is green.

---

## 7. Message map

| Message | Direction | Purpose |
|---|---|---|
| `PERFORM_ACTION` | popup → background | Trigger quality from the popup |
| `STREAM_START` | background → content | Create the streaming overlay |
| `REQUEST_CONTENT` | background → content | Ask for timings + extracted text |
| `STREAM_CHUNK` | background → content | Stream the raw AI JSON into Logs |
| `TRANSLATED_RESULT` | background → content | Deliver verdict + timings + screenshot |

---

## 8. Key files

| File | Responsibility |
|---|---|
| `background.js` | `handleAction("quality")`, screenshot capture, CDX status lookup, orchestration |
| `content/services/pageAnalyzer.js` | `analyzePage()` — routes quality to `getPageTimings()` |
| `content/utils/pageTimings.js` | `getPageTimings()` — performance entry aggregation |
| `content/ui/quality-popup.js` | `qualityPopup(timings)` + `statusBadge()` UI |
| `content/ui/overlay.js` | Streaming overlay, `appendQualityTimings()`, `setScreenshot()` |
| `content/ui/styles.js` | Overlay + quality section styling |
| `ai/utility.js` | `analyzePage()` quality branch — schema-constrained streaming |
| `api/cdx.js` | `getSnapshotStatus_quality()` |
| `Public/200.jpeg`, `Public/404.jpeg` | Verdict badge images |

---

## 9. Edge cases & notes

- **Screenshot capture fails** (invisible tab): analysis proceeds text-only; the 🖼️ QA item is skipped and the screenshot accordion is hidden.
- **Unrecorded/unavailable snapshot**: the badge shows the warning state, and no HTTP status line is injected into the prompt.
- **Malformed JSON from the model**: the raw text is shown as the summary; the quality section still renders with the real timing/HTTP data.
- **No caching**: unlike Summarize, quality results are regenerated every time so the verdict reflects the live render.
- **Soft-404 detection**: deliberately baked into the prompt — a 200 statuscode does not mean the page is healthy.

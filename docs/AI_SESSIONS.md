# AI Sessions & On-Device AI Usage

This document describes how the extension uses the **on-device Gemini Nano** capabilities — the built-in **Prompt API** (`LanguageModel`), **Language Detector API** (`LanguageDetector`), and **Translator API** (`Translator`). All logic lives in `ai/utility.js` inside a single `AISession` class.

---

## 1. Guiding principles

1. **Everything is on-device.** No page content, screenshot, or query ever leaves the browser for AI processing.
2. **Sessions are specialised.** Different jobs get different `LanguageModel.create()` configurations (expected inputs, system prompts) so each model is narrowly prompted and stays consistent.
3. **Parallel jobs never share context.** Long-running one-shot analyses (summarize, quality, change-summary) run on a **clone** of the main session and are destroyed afterwards.
4. **Availability is always checked.** Every entry point guards on `LanguageModel.availability()` and degrades gracefully when the model is `unavailable`/`downloadable`.

---

## 2. Session inventory

| Property | Created by | Purpose | Streamed? | Constrained? |
|---|---|---|---|---|
| `session` | `init()` | Main analysis session (text + image) | Yes (`analyzePage`) | Quality only |
| `insightSession` | `init()` | Structured insights (FAQs + famous people) | No (`prompt`) | Yes |
| `compareSession` | `CompareSessionInit()` | Natural-language date → two timestamps | No (`prompt`) | Yes |
| `trendSession` | `TrendSessionInit()` | Word-count evolution insight | No (`prompt`) | No |
| `compareChatSession` | `compareChatInit()` | Persistent comparison chat | Yes (`promptStreaming`) | No |

Each is created lazily on first use.

---

## 3. Availability gating

```js
const availability = await LanguageModel.availability();
if (availability === "available") { ... }
```

`availability()` returns one of `"available"`, `"downloadable"`, `"unavailable"`. The extension only proceeds when it is `"available"`. Feature-level guards:

- **Summarize / Quality**: `checkAIAvailability()` in background.js before starting; fails with a friendly message.
- **Compare**: the diff pipeline runs without AI if unavailable; only the change summary + chat are skipped. `compareChatInit` returns `false` if unavailable (the overlay shows "AI is not available").
- **Trend**: `getTrendInsight` returns a fallback string when the session can't be created.

---

## 4. Creating a session

The extension consistently uses `LanguageModel.create({ expectedOutputLanguages, expectedInputs, initialPrompts })`:

```js
this.session = await LanguageModel.create({
  expectedOutputLanguages: ["en"],
  expectedInputs: [{ type: "text" }, { type: "image" }],   // main session accepts screenshots
  initialPrompts: [{ role: "system", content: "You are an assistant that analyzes archived web pages ..." }]
});
```

- `expectedInputs` advertises what the session may receive. Only the main `session` declares `image` — it powers the Quality screenshot analysis. All other sessions declare text only.
- `initialPrompts` seeds a **system prompt** that shapes behaviour. The most elaborate ones:

  - **Compare date parser** (`CompareSessionInit`): *"You are an expert date and time parser. Convert the user's request into EXACTLY TWO 14-digit Wayback Machine timestamps (YYYYMMDDHHMMSS)"* — plus rules about defaulting to the 1st of the month/year, a rule that `tsA`/`tsB` must never be identical, and worked examples.
  - **Trend analyst** (`TrendSessionInit`): *"Your ONLY job is to analyze historical word count data and output ONE OR TWO short, punchy sentence(s)..."* — with output-format rules (no prefatory phrases, under 40 words, include trivia) and examples.
  - **Compare chat** (`compareChatInit`): built dynamically from the comparison context (see §8).

---

## 5. Session cloning for one-shot analyses

`init()` creates `session` and immediately sets `insightSession = session.clone()`. For every one-shot analysis the code clones again:

```js
const worker = await this.session.clone();   // lightweight clone, no context overlap
const stream = await worker.promptStreaming(...);
worker.destroy();
```

This is used by:
- `analyzePage(...)` — summarize / quality (streamed, destroyed after).
- `summarizeChanges(...)` — change summary (non-streamed, destroyed after).

Cloning guarantees concurrent/sequential analyses never bleed context into the shared `session`.

---

## 6. JSON schema constraints (`responseConstraint`)

Structured outputs are guaranteed via the schema constraint option:

```js
const result = await session.prompt(prompt, { responseConstraint: schema });
```

Schemas used:

| Feature | Schema shape |
|---|---|
| **Quality** (`analyzePage`) | `{ errorStatus: string, contentCompleteness: string }` (+ `screenshotQuality` when a screenshot was captured); `additionalProperties: false` |
| **Insights** (`getStructuredInsights`) | `{ faqs: [{question, answer}], famousPeople: [{name, description}] }` |
| **Timestamps** (`getTimeStamp`) | `{ tsA: string, tsB: string }` (14-digit `YYYYMMDDHHMMSS`) |

Notes:
- Quality uses the schema with **streaming** (`promptStreaming(..., { responseConstraint })`); the raw JSON is parsed after the stream completes and mapped to QA items with 🛑/📄/🖼️ icons.
- Parse failures are caught — `analyzePage` keeps the raw text, `getStructuredInsights` returns empty arrays, `getTimeStamp` returns `null` (triggering the "Could not find snapshots to compare with" error).

---

## 7. Streaming, abort, and stop

Two streaming paths exist:

**Analysis streaming (`analyzePage`)**

```js
const stream = await worker.promptStreaming(promptInput, streamOptions);
for await (const chunk of stream) {
  fullText += chunk;
  chrome.tabs.sendMessage(tabId, { type: "STREAM_CHUNK", chunk });
}
```

Chunks are forwarded to the content script's Logs tab; the accumulated string becomes the final summary. Quality passes `streamOptions = { responseConstraint: qualitySchema }`.

**Chat streaming (`compareChatStream`)**

```js
const stream = await this.compareChatSession.promptStreaming(message, { signal });
```

- The `signal` comes from an `AbortController` created in background.js per `messageId` (`_chatStreamControllers`).
- The overlay's stop button sends `CHAT_STOP` → background calls `controller.abort()`.
- On `AbortError`, the partial text is persisted with a `[stopped]` marker and the stream is reported as ended (`CHAT_STREAM_END` with empty `fullText`).

---

## 8. Persistent comparison chat

`compareChatInit(sessionKey, context)` (ai/utility.js):

1. **Restore from storage** — if `chrome.storage.local[sessionKey].initialPrompts` exists, the session is recreated with `LanguageModel.create(sessionData)` and the stored history is restored. This is what makes conversations survive page reloads.
2. **Fresh creation** — otherwise builds a **system prompt from the comparison context**:

   - URL, both versions with **exact archived dates** formatted by `formatDate` (e.g. *"Version A (newer, May 27, 2005)"*).
   - `+added / −removed` word stats, the AI change summary, and a ~3000-char `diffPreview`.
   - Explicit rules: answer in 2–4 sentences, *"Never invent or alter these dates"* (fixes a hallucination bug where the model produced timestamps like `2020-04-27`), refer to versions by their archived date, don't fabricate facts outside the context.

3. `compareChatStream` pushes each completed turn `{ user, assistant }` into `compareChatHistory` and persists it under the session key (also on abort, with `[stopped]`).
4. `destroyCompareChat()` destroys the session and clears history/key; called by `CHAT_RESET` when switching comparisons.

---

## 9. Translation APIs

`translateResult(text, targetLanguage)` (ai/utility.js):

1. `LanguageDetector.create()` → `detect(text)` → `detectedLanguage`.
2. `Translator.availability({ sourceLanguage, targetLanguage })` — if `"unavailable"`, return the original text untouched.
3. `Translator.create({ sourceLanguage, targetLanguage })` → translate **line-by-line** (line splitting preserves structure) → `translator.destroy()`.

`translateInsights(insights, targetLanguage)`:

- Collects all FAQ question/answer and person name/description strings, detects the language once, translates them all in parallel, and rebuilds the insights object. English originals are preserved in `famousPeopleOriginal` for hover tooltips.
- Any failure falls back to the original (English) data.

---

## 10. Change summary (`summarizeChanges`)

```js
const worker = await this.session.clone();
// diff text truncated to 6000 chars with a "... (truncated)" note
// prompt adapts: title change noted; zero-diff => "No textual content differences were detected..."
const result = await worker.prompt(prompt);
worker.destroy();
```

- Runs on a clone and uses non-streaming `prompt` (result arrives whole).
- **Zero-diff handling**: when the diff is empty the prompt explicitly tells the model no textual differences were detected, so it still produces a meaningful summary (e.g. surfacing a title change). This is the fix for the bug where empty diffs produced no summary at all.
- Returns `""` on failure, and the caller only invokes it when AI is available.

---

## 11. Lifecycle summary

| Action | When |
|---|---|
| `init()` | Lazy, first summarize/quality/compare-chat call |
| `session.clone()` | Every `analyzePage` / `summarizeChanges`; `destroy()` after |
| `insightSession` | Created once, never destroyed (reused across summaries) |
| `compareSession` / `trendSession` | Created once per browser session, reused |
| `compareChatSession` | Per `(url, tsA, tsB)`; destroyed via `destroyCompareChat()` on `CHAT_RESET` or when the chat key changes |
| `translator` / `detector` | Created per translation call, destroyed after |

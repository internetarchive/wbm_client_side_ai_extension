# wbm_client_side_ai_extension

Google Summer of Code (GSoC) 2026 Wayback Machine Client-Side AI Extension project

## Branch Structure

```
main
  └── sudipta/extension-setup
       └── feature/right-click-menu          ← Parent branch, base for all features
            ├── feature/streaming-response    ← Adds streaming AI response
            │
            └── feature/resizable-minimize-overlay   ← Refactored UI + resizable/minimize
                 └── feature/faqs-famous-persons     ← FAQs + famous people insights
                       └── feature/translate-faqs-insights    ← Translation for all outputs
                             └── feature/accordion-tab-view    ← Accordion + tab UI
                                   └── feature/loading-ui-refinements   ← Spinner/loading polish
                                         └── feature/ai-session-enhancements  ← System prompts + responseConstraint
                                                └── feature/screenshot-quality-enhancements  ← Screenshot + quality responseConstraint + v1 caching
                                                └── feature/caching-report  ← (current) Caching architecture report

```

- **`main`** — Initial project setup
- **`sudipta/extension-setup`** — Development environment setup
- **`feature/right-click-menu`** — Context menu integration with network timing and quality analysis
- **`feature/streaming-response`** — Real-time streaming of AI responses via Gemini Nano
- **`feature/resizable-minimize-overlay`** — Shadow DOM isolation, resizable/minimizable popup, refactored into modular UI files
- **`feature/faqs-famous-persons`** — Structured insights (FAQs + famous people) alongside streamed summaries
- **`feature/translate-faqs-insights`** — Translator API for FAQs, famous people, and summary text
- **`feature/accordion-tab-view`** — Accordion containers, tab switching, and unified loading states
- **`feature/loading-ui-refinements`** — Changed the UI to match the wayback machine colour
- **`feature/ai-session-enhancements`** — System prompts and responseConstraint for AI sessions
- **`feature/screenshot-quality-enhancements`** — Viewport screenshot + multimodal AI for quality analysis, quality responseConstraint schema, instant overlay, clone per session to prevent context leaking, v1 caching for summarize with StorageCleaner
- **`feature/caching-report`** — Comprehensive caching implementation report at `docs/CACHING.md`

## Installation (Development)

1. Clone the repository

```bash
git clone https://github.com/internetarchive/wbm_client_side_ai_extension.git
cd wbm_client_side_ai_extension
```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** in the top right

4. Click **Load unpacked** and select the project folder

5. Visit any archived page on [web.archive.org](https://web.archive.org)

6. Right-click anywhere on the page to open the context menu.

## Demo

[<img src="https://img.youtube.com/vi/FOKc8hIP7dQ/maxresdefault.jpg" width="50%">](https://youtu.be/FOKc8hIP7dQ)

## Feature Documentation

Detailed technical docs describing the end-to-end flow of each feature (entry points, message routing, AI sessions, caching, and edge cases):

- [Summarize](/docs/SUMMARY.md) — on-device page summarization, structured insights, and translation
- [Quality](/docs/QUALITY.md) — page quality verdict combining load timings, HTTP status, and screenshot analysis
- [Comparison](/docs/COMPARISON.md) — snapshot diffing, AI change summaries, and the archive-aware chat

### Developer Documentation

- [Architecture](/docs/ARCHITECTURE.md) — MV3 runtime contexts, communication model, overlay pattern, directory layout
- [Message Protocol](/docs/MESSAGE_PROTOCOL.md) — full reference of every runtime message between contexts
- [AI Sessions](/docs/AI_SESSIONS.md) — how the on-device Gemini Nano sessions, streaming, and translation APIs are used

## GSoC Documentation

Weekly progress, meeting notes and development logs are maintained at:
[Notion Doc](https://www.notion.so/GSoC-2026-Internet-Archive-366417d0f1468091ad29cf698b03cff2)

Blog posts documenting the journey:
[Hashnode Blog](https://sudiptadas.hashnode.dev)

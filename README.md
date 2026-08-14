# wbm_client_side_ai_extension

Google Summer of Code (GSoC) 2026 Wayback Machine Client-Side AI Extension project

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

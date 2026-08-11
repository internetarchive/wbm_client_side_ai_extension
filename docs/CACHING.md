# Technical Design Report: AI Response Caching & Storage Management

## 1. Executive Summary

This report outlines the architectural decisions and implementation details for the caching layer of the Wayback Machine AI Helper Chrome Extension. The primary objective of this system is to cache AI-generated summaries and structured insights (FAQs, notable figures) to minimize redundant processing, reduce latency, and provide a near-instantaneous user experience on repeat visits to previously analyzed archived pages.

## 2. Architectural Constraints & Decisions

### 2.1 Manifest V3 and Storage Limitations

The initial concept involved using standard DOM `window.localStorage` to persist AI sessions. However, Chrome Extension Manifest V3 relies on ephemeral Service Workers for background processing, which **do not have access to the DOM or** `localStorage`.

**Decision:** The architecture utilizes the asynchronous `chrome.storage.local` API. This provides a default 5MB storage quota (sufficient for thousands of text-based summaries) and allows cross-session persistence.

### 2.2 Cache Key Taxonomy

**Scope:** Only `summarize` actions are cached. `quality` is excluded because it depends on dynamic inputs (screenshot, timing data, page state) that vary per session — caching it would be both expensive (screenshots are megabytes) and unreliable (same URL can produce different quality results on reload).

Cache key structure:
`wbm_summarize_{tab.url}_{targetLanguage}`

- **URL:** Ensures the summary maps exactly to the specific Wayback Machine snapshot.
- **Target Language:** The current tab view shows English + the user's preferred language side by side. Caching by target language avoids redundant translation: if the user's preferred language is Hindi, we cache the Hindi result so it serves instantly on repeat visits.
- **Future — Language Dropdown:** A planned feature will add a dropdown to translate into any language on-demand. The English `originalSummary` is always stored in the cached payload, so the content script can translate it in real-time without regenerating AI output.

### 2.3 Page Reload Handling (Cache Staleness)

If a page loaded properly on the first visit (cached successfully) but loads as a broken/empty snapshot on a subsequent visit, serving the old summary would be misleading.

**Decision — Option B (Cache by URL, accept staleness):** The cache key uses only the URL. If content extraction produces garbage on a broken page, the AI generates a low-quality result → `success` is false → the result is NOT cached. A subsequent good load misses the cache and regenerates correctly. The edge case where a broken page still extracts "successfully" is rare and acceptable for v1.

## 3. Core Implementation: Background Interception

The caching logic is injected directly into the `chrome.contextMenus.onClicked` listener inside `background.js`. It intercepts the user request, checks for an existing cache entry, and either serves the cached payload immediately or initiates the AI processing pipeline.

### 3.1 Background Service Worker Logic (`background.js`)

```javascript
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // --- Existing validation checks (playback page, browser support, AI availability) ---

  if (info.menuItemId === "summarize" || info.menuItemId === "quality") {
    chrome.storage.sync.get(['targetLanguage'], async (result) => {
      const targetLanguage = result.targetLanguage || 'en';

      // --- CACHE CHECK (summarize only) ---
      if (info.menuItemId === "summarize") {
        const cacheKey = `wbm_summarize_${tab.url}_${targetLanguage}`;
        const cachedData = await chrome.storage.local.get([cacheKey]);

        if (cachedData[cacheKey]) {
          console.log(`[Cache] HIT for ${cacheKey}. Serving instantly.`);

          chrome.tabs.sendMessage(tab.id, {
            type: "STREAM_START",
            action: info.menuItemId,
            targetLanguage
          });

          chrome.tabs.sendMessage(tab.id, {
            type: "TRANSLATED_RESULT",
            ...cachedData[cacheKey]
          });

          chrome.tabs.sendMessage(tab.id, { type: "STREAM_END" });

          // Cached insights (only for summarize)
          const insightKey = `wbm_insights_${tab.url}_${targetLanguage}`;
          const cachedInsights = await chrome.storage.local.get([insightKey]);
          if (cachedInsights[insightKey]) {
            chrome.tabs.sendMessage(tab.id, {
              type: "STRUCTURED_INSIGHTS",
              ...cachedInsights[insightKey]
            });
          }
          return; // Exit early, skipping AI processing
        }
      }

      console.log(`[Cache] MISS for ${cacheKey || 'quality (not cached)'}. Starting AI analysis...`);

      // --- STREAM_START, screenshot capture (quality only), REQUEST_CONTENT ---

      chrome.tabs.sendMessage(
        tab.id,
        { type: "REQUEST_CONTENT", action: info.menuItemId },
        async (response) => {
          if (!response || !response.content) return;

          // ... [Promise.all AI execution] ...

          const resultPayload = {
            action: info.menuItemId,
            success: Boolean(analysisResult?.success),
            summary: analysisResult?.summary ?? analysisResult?.error,
            originalSummary: analysisResult?.originalSummary,
            timings: info.menuItemId === "quality" ? timings : undefined,
            targetLanguage
            // NOTE: screenshot is deliberately excluded from caching (see §6)
          };

          // 3. Cache the successful result (summarize only)
          if (analysisResult?.success && info.menuItemId === "summarize") {
            const cacheKey = `wbm_summarize_${tab.url}_${targetLanguage}`;
            await chrome.storage.local.set({
              [cacheKey]: {
                ...resultPayload,
                timestamp: Date.now()
              }
            });
          }

          chrome.tabs.sendMessage(tab.id, {
            type: "TRANSLATED_RESULT",
            ...resultPayload
          });

          // 4. Cache & send Insights (summarize only)
          if (info.menuItemId === "summarize" && insights && (insights.faqs?.length || insights.famousPeople?.length)) {
            const insightPayload = { insights };

            if (targetLanguage && targetLanguage !== "en") {
              insightPayload.translatedInsights = await aiSession.translateInsights(insights, targetLanguage);
              insightPayload.targetLanguage = targetLanguage;
            }

            const insightKey = `wbm_insights_${tab.url}_${targetLanguage}`;
            await chrome.storage.local.set({
              [insightKey]: {
                ...insightPayload,
                timestamp: Date.now()
              }
            });

            chrome.tabs.sendMessage(tab.id, {
              type: "STRUCTURED_INSIGHTS",
              ...insightPayload
            });
          }
        }
      );
    });
  }
});
```

### 3.2 Handling Interrupted Streams

A critical design requirement is preventing the caching of partial or broken data. If a user closes the UI midway through a streaming response, the AI stream is interrupted.

- **Solution:** The `chrome.storage.local.set()` function is wrapped in a strict `if (analysisResult?.success)` block.
- **Result:** Only fully completed and successfully parsed JSON/text outputs are cached. Interrupted sessions gracefully fail without corrupting the local database.

---

## 4. Storage Maintenance & Eviction

`chrome.storage.local` does not feature an auto-expiring TTL (Time-To-Live) mechanism. To prevent the extension from eventually hitting the 5MB quota limit, a lightweight, automated eviction system was implemented using the **Singleton Pattern**.

### 4.1 The `StorageCleaner` Singleton (`ai/storageCleaner.js`)

This class guarantees that only one instance of the memory manager is instantiated, reading timestamps from the cached payload and purging data older than a specified threshold (e.g., 30 days).

```javascript
export class StorageCleaner {
    static instance = null;
    static LAST_SWEEP_KEY = 'wbm_last_sweep_ts';

    constructor() {
        if (StorageCleaner.instance) {
            return StorageCleaner.instance;
        }
        StorageCleaner.instance = this;
    }

    /**
     * Sweeps chrome.storage.local and removes keys starting with 'wbm_'
     * that have exceeded the allowed maximum age.
     * Gated by a timestamp — runs at most once per 24 hours.
     * @param {number} maxAgeDays - Expiration threshold in days.
     */
    async runSweep(maxAgeDays = 30) {
        try {
            // Gate: only sweep if >24h since last run
            const { [StorageCleaner.LAST_SWEEP_KEY]: lastSweep } = await chrome.storage.local.get(StorageCleaner.LAST_SWEEP_KEY);
            if (lastSweep && Date.now() - lastSweep < 24 * 60 * 60 * 1000) {
                return;
            }

            console.log("[StorageCleaner] Starting cache eviction sweep...");
            const allData = await chrome.storage.local.get(null);
            const now = Date.now();
            const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
            const keysToRemove = [];

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('wbm_') && key !== StorageCleaner.LAST_SWEEP_KEY && value && value.timestamp) {
                    if (now - value.timestamp > maxAgeMs) {
                        keysToRemove.push(key);
                    }
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`[StorageCleaner] Eviction complete. Removed ${keysToRemove.length} expired entries.`);
            } else {
                console.log("[StorageCleaner] Sweep complete. No expired entries found.");
            }

            // Update last-sweep timestamp
            await chrome.storage.local.set({ [StorageCleaner.LAST_SWEEP_KEY]: Date.now() });
        } catch (error) {
            console.error("[StorageCleaner] Error during storage sweep:", error);
        }
    }
}
```

### 4.2 Service Worker Boot Cycle Integration

Manifest V3 Service Workers are ephemeral. They boot up when an event occurs and shut down when idle. We leverage this boot cycle to run the eviction sweep natively, avoiding the need for heavy `chrome.alarms` or `setInterval` logic.

```javascript
// At the top of background.js
import { AISession } from "./ai/utility.js";
import { StorageCleaner } from "./ai/storageCleaner.js";

const aiSession = new AISession();
const storageCleaner = new StorageCleaner();

// Runs on service worker wake-up; internally gated to once per 24h
storageCleaner.runSweep(30);
```

---

## 5. Edge Cases & System Resiliency

While the architecture is designed to be highly fault-tolerant, the following edge cases were evaluated:

1. **Service Worker Termination Mid-Sweep:**
   - *Scenario:* Chrome suspends the background service worker during the `storageCleaner.runSweep()` loop.
   - *Resiliency:* The sweep performs a read-only evaluation of keys and executes a single atomic `chrome.storage.local.remove()` at the end. Interruption does not cause data corruption — stale data persists until the next successful sweep.

2. **Asynchronous Race Conditions:**
   - *Scenario:* A user rapidly triggers AI analysis on the same URL from multiple tabs simultaneously.
   - *Resiliency:* `chrome.storage.local` operations are asynchronous. If two tabs write to the same cache key concurrently, one overwrites the other with identical data. A read happening right before a write results in a Cache Miss, defaulting to normal AI processing. Neither case is breaking.

3. **Storage Quota Exceeded (Pre-Eviction):**
   - *Scenario:* The user exceeds the 5MB limit within a 30-day window before eviction clears old data.
   - *Resiliency:* `chrome.storage.local.set()` fails silently. The user still receives the AI summary on screen — it simply isn't cached until space is freed.

4. **Broken Page on Reload (Cache Staleness):**
   - *Scenario:* A page loads broken on the second visit, but the cached summary from the first (good) visit still exists.
   - *Resiliency:* Two-tier defense. First, content extraction on a broken page produces garbage → AI generates a poor result → `success: false` → result is not cached (new run). Second, even if extraction succeeds on broken content, the summary mismatch is constrained by the fact that only `success: true` results are cached — a corrupt page that passes extraction is rare and tolerable for v1.

## 6. Decisions & Rationale

This section documents the key architectural decisions made during review, along with their rationale.

### 6.1 Quality Analysis is NOT Cached

**Decision:** The `quality` action is excluded from caching entirely.

**Rationale:**
- Quality analysis depends on a viewport screenshot (~500KB–2MB as a data URL), page load timings, and extraction state — all of which vary per session.
- Caching quality results would consume disproportionate storage (screenshots are huge) for unreliable value (same URL can produce different quality on reload).
- The quality text output alone (without the screenshot) is useful but caching a screenshot-less quality result would display a screenshot accordion with no image — confusing UX.

### 6.2 Screenshot Excluded from Cached Payload

**Decision:** `screenshot` is stripped from `resultPayload` before storage. It is only included in the live `TRANSLATED_RESULT` message during the original run.

**Rationale:**
- A Base64-encoded viewport screenshot is typically 500KB–2MB. Caching it for every summarized page would fill the 5MB `chrome.storage.local` quota after 3–4 entries, defeating the purpose of keeping the extension lightweight.
- The screenshot is an input to the AI, not the output the user wants to retrieve. The cached value is the analysis text, not the screenshot.

### 6.3 StorageCleaner Gated by 24h Timestamp

**Decision:** `runSweep()` checks a `wbm_last_sweep_ts` marker and returns early if less than 24 hours have passed since the last sweep.

**Rationale:**
- The boot cycle integration (`§4.2`) calls `runSweep()` every time the service worker wakes up — potentially dozens of times per day for active users. Without gating, each wake-up scans all stored data unnecessarily.
- A daily sweep is sufficient for the 30-day eviction window.

### 6.4 Insight Cache Check Skipped for Quality

**Decision:** The insight cache is only checked on `summarize` cache hits.

**Rationale:**
- Insights (FAQs + famous people) are exclusively generated for the `summarize` action. Checking for them during a `quality` cache hit always misses — an unnecessary `chrome.storage.local` read on every quality invocation.
- The code branches on `info.menuItemId` before checking the insight cache.

### 6.5 `STREAM_END` Sent on Cache Hit

**Decision:** A `STREAM_END` message is sent after `TRANSLATED_RESULT` on cache hits.

**Rationale:**
- The streaming protocol expects `STREAM_START` → `STREAM_CHUNK`* → `STREAM_END`. On cache hits we skip `STREAM_CHUNK` but still send the bookend messages.
- While the content script doesn't depend on `STREAM_END` for cache-hit rendering (populateTab replaces content directly), maintaining protocol consistency prevents future issues if the content script logic ever reads `STREAM_END` as a signal.

### 6.6 Cache by URL, Not Content Hash

**Decision:** Cache key uses the raw snapshot URL. Content hashing is deferred.

**Rationale:**
- A content-hash key (`wbm_summarize_{url}_{contentHash}`) would require extracting page text before checking the cache, adding latency to every request.
- The `success: true` guard already prevents caching bad results from broken snapshots.
- This is Option B from the review discussion — acceptable for v1.

### 6.7 Future: On-Demand Language Dropdown

**Planned:** A dropdown in the UI to translate the summary into any language in real time, using the cached `originalSummary` (English) as the source.

**Implications:**
- The current pre-translation at generation time remains for the user's preferred language (cached per `targetLanguage`).
- The dropdown will be a pure client-side operation — no AI regeneration, no additional caching.
- If this feature ships, the cache key can optionally be simplified to `wbm_summarize_{url}` since all translations can be derived from the cached English text.

## 7. Conclusion

By migrating from synchronous DOM storage to Chrome's native asynchronous storage APIs, and wrapping the read/write logic within the context menu event lifecycle, the extension achieves robust, persistent caching. The addition of the Singleton `StorageCleaner` ensures the extension remains lightweight, performant, and compliant with best practices for Manifest V3 extension memory management.

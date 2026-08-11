export class StorageCleaner {
    static instance = null;
    static LAST_SWEEP_KEY = 'wbm_last_sweep_ts';

    constructor() {
        if (StorageCleaner.instance) {
            return StorageCleaner.instance;
        }
        StorageCleaner.instance = this;
    }

    async runSweep(maxAgeDays = 30) {
        try {
            const { [StorageCleaner.LAST_SWEEP_KEY]: lastSweep } = await chrome.storage.local.get(StorageCleaner.LAST_SWEEP_KEY);
            if (lastSweep && Date.now() - lastSweep < 24 * 60 * 60 * 1000) return;

            console.log("[StorageCleaner] Starting cache eviction sweep...");
            const allData = await chrome.storage.local.get(null);
            const now = Date.now();
            const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
            const keysToRemove = [];

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('wbm_') && key !== StorageCleaner.LAST_SWEEP_KEY && value?.timestamp) {
                    if (now - value.timestamp > maxAgeMs) {
                        keysToRemove.push(key);
                    }
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`[StorageCleaner] Eviction complete. Removed ${keysToRemove.length} expired entries.`);
            }

            await chrome.storage.local.set({ [StorageCleaner.LAST_SWEEP_KEY]: Date.now() });
        } catch (error) {
            console.error("[StorageCleaner] Error during storage sweep:", error);
        }
    }
}

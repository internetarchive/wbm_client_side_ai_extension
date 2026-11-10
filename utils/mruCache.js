const MRU_KEY = "wbm_mru_actions";
const DEFAULT_PROMOTED_COUNT = 2;
const ALL_ACTIONS = ["summarize", "quality", "compare"];

function getDefaultState() {
  return {
    order: [...ALL_ACTIONS],
    promotedCount: DEFAULT_PROMOTED_COUNT,
  };
}

export class MRUCache {
  static async getState() {
    const { [MRU_KEY]: stored } = await chrome.storage.local.get(MRU_KEY);
    if (!stored) return getDefaultState();
    return {
      order: stored.order ?? [...ALL_ACTIONS],
      promotedCount: stored.promotedCount ?? DEFAULT_PROMOTED_COUNT,
    };
  }

  static async saveState(state) {
    await chrome.storage.local.set({ [MRU_KEY]: state });
  }

  static async recordAction(action) {
    if (!ALL_ACTIONS.includes(action)) return;
    const state = await this.getState();
    state.order = [action, ...state.order.filter(a => a !== action)];
    await this.saveState(state);
  }

  static async getPromotedActions() {
    const state = await this.getState();
    return state.order.slice(0, state.promotedCount);
  }

  static async getCollapsedActions() {
    const state = await this.getState();
    return state.order.slice(state.promotedCount);
  }

  static async reset() {
    await this.saveState(getDefaultState());
  }
}

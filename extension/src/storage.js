const DEFAULTS = {
  mode: 'gentle',
  whitelist: [],
  stats: {
    totalDetected: 0,
    totalRejected: 0,
    totalSkipped: 0,
    totalHidden: 0,
    byDomain: {}
  },
  actionLog: [],
  bannerInfo: {}
};

const Storage = {
  _lock: Promise.resolve(),
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : DEFAULTS[key];
    } catch (e) {
      console.error('KoalaCookies: storage get failed', e);
      return DEFAULTS[key];
    }
  },

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (e) {
      console.error('KoalaCookies: storage set failed', e);
    }
  },

  async getSettings() {
    const mode = await this.get('mode');
    const whitelist = await this.get('whitelist');
    return { mode, whitelist };
  },

  async getStats() {
    return await this.get('stats');
  },

  async addLogEntry(entry) {
    const log = await this.get('actionLog');
    log.unshift(entry);
    await this.set('actionLog', log.slice(0, 10));
  },

  async getActionLog() {
    return await this.get('actionLog');
  },

  async clearLog() {
    await this.set('actionLog', []);
  },

  async setBannerInfo(domain, info) {
    const allInfo = await this.get('bannerInfo');
    allInfo[domain] = info;
    await this.set('bannerInfo', allInfo);
  },

  async getBannerInfo(domain) {
    const allInfo = await this.get('bannerInfo');
    return allInfo[domain] || null;
  },

  async updateStats(domain, update) {
    this._lock = this._lock.then(async () => {
    const stats = await this.getStats();
    const byDomain = stats.byDomain || {};

    if (!byDomain[domain]) {
      byDomain[domain] = { detected: 0, rejected: 0, skipped: 0, hidden: 0, lastSeen: null };
    }

    if (update.detected) {
      stats.totalDetected++;
      byDomain[domain].detected++;
    }
    if (update.rejected) {
      stats.totalRejected++;
      byDomain[domain].rejected++;
    }
    if (update.skipped) {
      stats.totalSkipped++;
      byDomain[domain].skipped++;
    }
    if (update.hidden) {
      stats.totalHidden++;
      byDomain[domain].hidden++;
    }

    byDomain[domain].lastSeen = new Date().toISOString();
    stats.byDomain = byDomain;

    await this.set('stats', stats);
    });
    return this._lock;
  }
};

const DEFAULTS = {
  mode: 'gentle',
  whitelist: [],
  disabledUntil: {},
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
    const disabledUntil = await this.get('disabledUntil');
    const cleaned = Storage._cleanExpiredDisables(disabledUntil);
    return { mode, whitelist, disabledUntil: cleaned };
  },

  async getStats() {
    return await this.get('stats');
  },

  async addLogEntry(entry) {
    this._lock = this._lock.then(async () => {
      const log = await this.get('actionLog');
      log.unshift(entry);
      await this.set('actionLog', log.slice(0, 10));
    }).catch(console.error);
    return this._lock;
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
    }).catch(console.error);
    return this._lock;
  },

  async addToWhitelist(domain) {
    this._lock = this._lock.then(async () => {
      const whitelist = await this.get('whitelist');
      if (!whitelist.includes(domain)) {
        whitelist.push(domain);
        await this.set('whitelist', whitelist);
      }
    }).catch(console.error);
    return this._lock;
  },

  async removeFromWhitelist(domain) {
    this._lock = this._lock.then(async () => {
      const whitelist = await this.get('whitelist');
      const idx = whitelist.indexOf(domain);
      if (idx !== -1) {
        whitelist.splice(idx, 1);
        await this.set('whitelist', whitelist);
      }
    }).catch(console.error);
    return this._lock;
  },

  async setDisabledUntil(domain, timestampMs) {
    this._lock = this._lock.then(async () => {
      const disabledUntil = await this.get('disabledUntil');
      disabledUntil[domain] = timestampMs;
      await this.set('disabledUntil', disabledUntil);
    }).catch(console.error);
    return this._lock;
  },

  async removeDisabledUntil(domain) {
    this._lock = this._lock.then(async () => {
      const disabledUntil = await this.get('disabledUntil');
      if (disabledUntil[domain]) {
        delete disabledUntil[domain];
        await this.set('disabledUntil', disabledUntil);
      }
    }).catch(console.error);
    return this._lock;
  },

  _cleanExpiredDisables(disabledUntil) {
    if (!disabledUntil) return disabledUntil;
    var now = Date.now();
    var cleaned = {};
    var changed = false;
    var keys = Object.keys(disabledUntil);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (disabledUntil[key] > now) {
        cleaned[key] = disabledUntil[key];
      } else {
        changed = true;
      }
    }
    if (changed) {
      this.set('disabledUntil', cleaned).catch(function(){});
    }
    return cleaned;
  }
};

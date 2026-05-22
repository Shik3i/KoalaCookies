self.Stats = {
  _cache: null,
  _lastFetch: 0,
  _cacheDuration: 5000,

  async get() {
    const now = Date.now();
    if (this._cache && (now - this._lastFetch) < this._cacheDuration) {
      return this._cache;
    }

    const stats = await Storage.getStats();
    this._cache = stats;
    this._lastFetch = now;
    return stats;
  },

  invalidateCache() {
    this._cache = null;
    this._lastFetch = 0;
  }
};

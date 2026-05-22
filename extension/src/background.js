try {
  importScripts('storage.js');
} catch (e) {
  console.error('KoalaCookies: Failed to load storage module', e);
}

const Service = {
  async getStatsForPopup() {
    const stats = await Storage.getStats();
    return stats;
  },

  async getSettings() {
    const mode = await Storage.get('mode');
    const whitelist = await Storage.get('whitelist');
    return { mode, whitelist };
  },

  async setMode(mode) {
    await Storage.set('mode', mode);
  },

  async addToWhitelist(domain) {
    const whitelist = await Storage.get('whitelist');
    if (!whitelist.includes(domain)) {
      whitelist.push(domain);
      await Storage.set('whitelist', whitelist);
    }
  },

  async removeFromWhitelist(domain) {
    const whitelist = await Storage.get('whitelist');
    const index = whitelist.indexOf(domain);
    if (index !== -1) {
      whitelist.splice(index, 1);
      await Storage.set('whitelist', whitelist);
    }
  },

  async resetStats() {
    await Storage.set('stats', {
      totalDetected: 0,
      totalRejected: 0,
      totalSkipped: 0,
      totalHidden: 0,
      byDomain: {}
    });
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'bannerResult') {
    Service.getStatsForPopup().then(stats => {
      sendResponse({ success: true, stats });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'getStats') {
    Service.getStatsForPopup().then(stats => {
      sendResponse({ success: true, stats });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'getSettings') {
    Service.getSettings().then(settings => {
      sendResponse({ success: true, settings });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'setMode') {
    Service.setMode(message.mode).then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'addToWhitelist') {
    Service.addToWhitelist(message.domain).then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'removeFromWhitelist') {
    Service.removeFromWhitelist(message.domain).then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'resetStats') {
    Service.resetStats().then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await Storage.get('mode');
  if (!existing || existing === undefined || existing === null) {
    await Storage.set('mode', 'gentle');
  }

  const existingStats = await Storage.get('stats');
  if (!existingStats || existingStats.totalDetected === undefined) {
    await Storage.set('stats', {
      totalDetected: 0,
      totalRejected: 0,
      totalSkipped: 0,
      totalHidden: 0,
      byDomain: {}
    });
  }

  const existingWhitelist = await Storage.get('whitelist');
  if (!Array.isArray(existingWhitelist)) {
    await Storage.set('whitelist', []);
  }
});

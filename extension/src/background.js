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
    await Storage.clearLog();
    await Storage.set('bannerInfo', {});
  },

  async getPopupData() {
    const stats = await Storage.getStats();
    const mode = await Storage.get('mode');
    const whitelist = await Storage.get('whitelist');
    return { stats, settings: { mode, whitelist } };
  },

  async recordBannerResult(domain, action, detail, detectionInfo) {
    const logInfo = extractLogInfo(detail, action);
    const logEntry = {
      timestamp: new Date().toISOString(),
      domain: domain,
      action: action,
      method: logInfo.method,
      detail: logInfo.detail
    };
    await Storage.addLogEntry(logEntry);

    if (detectionInfo) {
      await Storage.setBannerInfo(domain, {
        provider: detectionInfo.provider,
        detectionMethod: detectionInfo.detectionMethod,
        containerInfo: detectionInfo.containerInfo,
        action: action,
        resultDetail: detail,
        timestamp: new Date().toISOString()
      });
    }

    const update = { detected: true };
    if (action === 'rejected') {
      update.rejected = true;
    } else if (action === 'hidden') {
      update.hidden = true;
    } else if (action === 'skipped') {
      update.skipped = true;
    }
    await Storage.updateStats(domain, update);
  },

  async getActionLog() {
    return await Storage.getActionLog();
  },

  async getDevInfo(domain) {
    return await Storage.getBannerInfo(domain);
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'bannerResult') {
    Service.recordBannerResult(
      message.domain,
      message.action,
      message.detail,
      {
        provider: message.provider,
        detectionMethod: message.detectionMethod,
        containerInfo: message.containerInfo
      }
    ).then(() => {
      return Service.getStatsForPopup();
    }).then(stats => {
      sendResponse({ success: true, stats });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'getPopupData') {
    Service.getPopupData().then(data => {
      sendResponse({ success: true, ...data });
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

  if (message.type === 'getActionLog') {
    Service.getActionLog().then(log => {
      sendResponse({ success: true, log });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'getDevInfo') {
    Service.getDevInfo(message.domain).then(info => {
      sendResponse({ success: true, info });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }
});

function extractLogInfo(detail, action) {
  if (typeof detail === 'object' && detail !== null && detail.method) {
    return { method: detail.method, detail: detail.text || '-' };
  }
  if (action === 'hidden') {
    return { method: 'aggressive', detail: '-' };
  }
  if (action === 'skipped') {
    return { method: '-', detail: typeof detail === 'string' ? detail : '-' };
  }
  return { method: '-', detail: '-' };
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await Storage.get('mode');
  if (existing == null) {
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

try {
  importScripts('rulesEngine.js', 'selectorMeta.js', 'storage.js');
} catch (e) {
  console.error('KoalaCookies: Failed to load modules', e);
}

const Service = {
  async getStatsForPopup() {
    const stats = await Storage.getStats();
    return stats;
  },

  async getSettings() {
    const mode = await Storage.get('mode');
    const whitelist = await Storage.get('whitelist');
    const disabledUntil = await Storage.get('disabledUntil');
    Storage._cleanExpiredDisables(disabledUntil);
    return { mode, whitelist, disabledUntil };
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

  async disableDomain(domain, durationMs) {
    if (!durationMs) {
      return await Service.addToWhitelist(domain);
    }

    const whitelist = await Storage.get('whitelist');
    const wlIdx = whitelist.indexOf(domain);
    if (wlIdx !== -1) {
      whitelist.splice(wlIdx, 1);
      await Storage.set('whitelist', whitelist);
    }

    const disabledUntil = await Storage.get('disabledUntil');
    disabledUntil[domain] = Date.now() + durationMs;
    await Storage.set('disabledUntil', disabledUntil);
  },

  async enableDomain(domain) {
    const whitelist = await Storage.get('whitelist');
    const wlIdx = whitelist.indexOf(domain);
    if (wlIdx !== -1) {
      whitelist.splice(wlIdx, 1);
      await Storage.set('whitelist', whitelist);
    }

    const disabledUntil = await Storage.get('disabledUntil');
    if (disabledUntil[domain]) {
      delete disabledUntil[domain];
      await Storage.set('disabledUntil', disabledUntil);
    }
  },
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
    const disabledUntil = await Storage.get('disabledUntil');
    Storage._cleanExpiredDisables(disabledUntil);
    return { stats, settings: { mode, whitelist, disabledUntil } };
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
  },

  async getSelectorList() {
    await RulesEngine.ready();
    var providers = RulesEngine.getProviders();
    return providers.map(function(p) {
      var sel = p.selectors || {};
      return {
        id: p.id,
        name: p.name,
        url: p.url || null,
        selectors: {
          container: sel.container || null,
          rejectAll: sel.rejectAll || null,
          settings: sel.settings || null,
          saveSettings: sel.saveSettings || null,
          acceptAll: sel.acceptAll || null
        }
      };
    });
  },

  async startPicker() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab');
    const url = tab.url || '';
    if (/^(chrome|edge|about|chrome-extension|moz-extension):/.test(url)) {
      throw new Error('Element picker cannot run on this page type');
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/picker.js']
      });
    } catch (e) {
      throw new Error('Cannot access this page. ' + e.message);
    }
  },

  async saveCustomSelector(profile, domain) {
    const customSelectors = (await chrome.storage.local.get('customSelectors')).customSelectors || [];
    customSelectors.push({
      profile,
      domain: domain || 'unknown',
      addedAt: new Date().toISOString()
    });
    await chrome.storage.local.set({ customSelectors });
  },

  async getCustomSelectors() {
    const data = await chrome.storage.local.get('customSelectors');
    return data.customSelectors || [];
  },

  async removeCustomSelector(index) {
    const all = (await chrome.storage.local.get('customSelectors')).customSelectors || [];
    all.splice(index, 1);
    await chrome.storage.local.set({ customSelectors: all });
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

  if (message.type === 'disableDomain') {
    Service.disableDomain(message.domain, message.durationMs || 0).then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'enableDomain') {
    Service.enableDomain(message.domain).then(() => {
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

  if (message.type === 'getSelectorList') {
    Service.getSelectorList().then(function(providers) {
      sendResponse({ success: true, providers: providers });
    }).catch(function(e) {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'startPicker') {
    Service.startPicker().then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'pickerElementCaptured') {
    let domain = 'unknown';
    try {
      domain = new URL(sender.tab.url).hostname;
    } catch {}
    Service.saveCustomSelector(message.profile, domain).then(() => {
      return Service.getCustomSelectors();
    }).then(selectors => {
      sendResponse({ success: true, selectors });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'pickerCancelled') {
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'getCustomSelectors') {
    Service.getCustomSelectors().then(selectors => {
      sendResponse({ success: true, selectors });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'removeCustomSelector') {
    Service.removeCustomSelector(message.index).then(() => {
      return Service.getCustomSelectors();
    }).then(selectors => {
      sendResponse({ success: true, selectors });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }
});

function extractLogInfo(detail, action) {
  if (typeof detail === 'object' && detail !== null && detail.method) {
    if (detail.toggled !== undefined) {
      return { method: detail.method, detail: 'Toggled ' + detail.toggled + ' categories' };
    }
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

  const existingDisabled = await Storage.get('disabledUntil');
  if (!existingDisabled || typeof existingDisabled !== 'object' || Array.isArray(existingDisabled)) {
    await Storage.set('disabledUntil', {});
  }
});

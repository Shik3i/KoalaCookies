try {
  importScripts('rulesEngine.js', 'storage.js');
} catch (e) {
  console.error('KoalaCookies: Failed to load modules', e);
}

var tabStates = {};

var BADGE_COLORS = {
  rejected: '#2e7d32',
  hidden: '#1565c0',
  skipped: '#f57c00',
  disabled: '#9e9e9e',
  no_banner: '#9e9e9e',
  error: '#c62828'
};

var BADGE_SYMBOLS = {
  rejected: '✓',
  hidden: '✕',
  skipped: '!',
  disabled: '—',
  no_banner: '',
  error: '✕'
};

function _setTabBadge(tabId, state) {
  var color = BADGE_COLORS[state] || '#9e9e9e';
  var symbol = BADGE_SYMBOLS[state] || '';
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color }).catch(function(){});
  chrome.action.setBadgeText({ tabId: tabId, text: symbol }).catch(function(){});
}

function _updateTabState(tabId, state, domain) {
  if (!tabId || tabId < 0) return;
  tabStates[tabId] = { state: state, domain: domain, timestamp: Date.now() };
  _setTabBadge(tabId, state);
}

function _clearTabState(tabId) {
  delete tabStates[tabId];
  chrome.action.setBadgeText({ tabId: tabId, text: '' }).catch(function(){});
}

function _getTabState(tabId) {
  return tabStates[tabId] || null;
}

chrome.tabs.onRemoved.addListener(function(tabId) {
  _clearTabState(tabId);
});

setInterval(function() {
  var now = Date.now();
  var MAX_AGE = 5 * 60 * 1000;
  var ids = Object.keys(tabStates);
  for (var i = 0; i < ids.length; i++) {
    if (now - tabStates[ids[i]].timestamp > MAX_AGE) {
      delete tabStates[ids[i]];
    }
  }
}, 60000);

chrome.tabs.onActivated.addListener(function(activeInfo) {
  var state = _getTabState(activeInfo.tabId);
  if (state) {
    _setTabBadge(activeInfo.tabId, state.state);
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.url) {
    _clearTabState(tabId);
  }
});

const Service = {
  async getStatsForPopup() {
    const stats = await Storage.getStats();
    return stats;
  },

  async getSettings() {
    const mode = await Storage.get('mode');
    const whitelist = await Storage.get('whitelist');
    const disabledUntil = await Storage.get('disabledUntil');
    const cleaned = Storage._cleanExpiredDisables(disabledUntil);
    return { mode, whitelist, disabledUntil: cleaned };
  },

  async setMode(mode) {
    await Storage.set('mode', mode);
  },

  async addToWhitelist(domain) {
    await Storage.addToWhitelist(domain);
    await Service._setActiveTabDisabled(domain);
  },

  async enableDomain(domain) {
    await Storage.removeFromWhitelist(domain);
    await Storage.removeDisabledUntil(domain);

    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      for (var i = 0; i < tabs.length; i++) {
        try {
          var url = new URL(tabs[i].url);
          if (url.hostname === domain) {
            _clearTabState(tabs[i].id);
          }
        } catch (e) {}
      }
    } catch (e) {}
  },

  async disableDomain(domain, durationMs) {
    if (!durationMs) {
      return await Service.addToWhitelist(domain);
    }

    await Storage.removeFromWhitelist(domain);
    await Storage.setDisabledUntil(domain, Date.now() + durationMs);

    await Service._setActiveTabDisabled(domain);
  },

  async _setActiveTabDisabled(domain) {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      for (var i = 0; i < tabs.length; i++) {
        try {
          var url = new URL(tabs[i].url);
          if (url.hostname === domain) {
            _updateTabState(tabs[i].id, 'disabled', domain);
          }
        } catch (e) {}
      }
    } catch (e) {}
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
    const cleaned = Storage._cleanExpiredDisables(disabledUntil);
    return { stats, settings: { mode, whitelist, disabledUntil: cleaned } };
  },

  async recordBannerResult(domain, action, detail, detectionInfo, sender) {
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

    if (sender && sender.tab && sender.tab.id) {
      _updateTabState(sender.tab.id, action, domain);
    }
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
  },

  async getTabStateForPopup(tabId) {
    return _getTabState(tabId);
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
      },
      sender
    ).then(() => {
      return Service.getStatsForPopup();
    }).then(stats => {
      sendResponse({ success: true, stats });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }

  if (message.type === 'bannerDisabled') {
    if (sender && sender.tab && sender.tab.id) {
      _updateTabState(sender.tab.id, 'disabled', message.domain);
    }
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'getTabState') {
    Service.getTabStateForPopup(message.tabId).then(function(state) {
      sendResponse({ success: true, state: state });
    }).catch(function(e) {
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
    Service.enableDomain(message.domain).then(() => {
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

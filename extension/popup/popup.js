let currentDomain = '';

document.addEventListener('DOMContentLoaded', () => init().catch(console.error));

async function init() {
  var i18n = chrome.i18n.getMessage;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    try {
      const url = new URL(tabs[0].url);
      currentDomain = url.hostname;
      document.getElementById('currentDomain').textContent = currentDomain;
    } catch {
      document.getElementById('currentDomain').textContent = i18n('popupUnavailable');
    }
  }

  var manifest = chrome.runtime.getManifest();
  var versionEls = document.querySelectorAll('.version, .footer-github');
  for (var i = 0; i < versionEls.length; i++) {
    var el = versionEls[i];
    if (el.classList.contains('version')) {
      el.textContent = 'v' + manifest.version;
    } else if (el.classList.contains('footer-github')) {
      el.childNodes[el.childNodes.length - 1].textContent = ' Version ' + manifest.version;
    }
  }

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.textContent = i18n('popupTab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1));
  });

  await loadPopupData();

  document.getElementById('modeSelect').addEventListener('change', onModeChange);
  document.getElementById('resetStatsBtn').addEventListener('click', onResetStats);
  document.getElementById('whitelistBtn')?.addEventListener('click', onToggleWhitelist);
  document.getElementById('enableDomainBtn').addEventListener('click', onEnableDomain);
  document.getElementById('disableDropdownBtn').addEventListener('click', toggleDisableDropdown);
  document.getElementById('copyLogBtn').addEventListener('click', copyLogToClipboard);
  document.getElementById('startPickerBtn').addEventListener('click', startPicker);

  document.querySelectorAll('.disable-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      var durationMs = parseInt(opt.dataset.duration, 10);
      onDisableDomain(durationMs);
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('enableDomainBtn').addEventListener('dblclick', toggleWhitelistList);

  await updateDisableButton();
  await updateDomainStatus();

  translatePage();
}

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
  });
}

async function sendMessage(msg) {
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (err) {
    console.error('KoalaCookies: sendMessage failed', err);
    showToast(chrome.i18n.getMessage('popupToastConnectionError'));
    return null;
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="' + tabName + '"]').classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');

  if (tabName === 'log') loadActionLog();
  if (tabName === 'dev') {
    loadDevInfo();
    loadSelectorList();
    loadCustomSelectors();
  }
}

async function loadPopupData() {
  const popupData = await sendMessage({ type: 'getPopupData' });
  if (popupData && popupData.success) {
    const s = popupData.stats;
    document.getElementById('statDetected').textContent = s.totalDetected || 0;
    document.getElementById('statRejected').textContent = s.totalRejected || 0;
    document.getElementById('statSkipped').textContent = s.totalSkipped || 0;
    document.getElementById('statHidden').textContent = s.totalHidden || 0;
    document.getElementById('modeSelect').value = popupData.settings.mode || 'gentle';
  }
}

async function loadStats() {
  const response = await sendMessage({ type: 'getStats' });
  if (response && response.success) {
    const s = response.stats;
    document.getElementById('statDetected').textContent = s.totalDetected || 0;
    document.getElementById('statRejected').textContent = s.totalRejected || 0;
    document.getElementById('statSkipped').textContent = s.totalSkipped || 0;
    document.getElementById('statHidden').textContent = s.totalHidden || 0;
  }
}

async function loadSettings() {
  const response = await sendMessage({ type: 'getSettings' });
  if (response && response.success) {
    document.getElementById('modeSelect').value = response.settings.mode || 'gentle';
  }
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function actionClass(action) {
  if (action === 'rejected') return 'log-rejected';
  if (action === 'hidden') return 'log-hidden';
  return 'log-skipped';
}

async function loadActionLog() {
  const response = await sendMessage({ type: 'getActionLog' });
  const container = document.getElementById('logEntries');
  if (!response || !response.success || !response.log || response.log.length === 0) {
    container.innerHTML = '<div class="log-empty">' + chrome.i18n.getMessage('popupLogEmpty') + '</div>';
    return;
  }

  container.innerHTML = response.log.map(entry => {
    const time = formatTime(entry.timestamp);
    const cls = actionClass(entry.action);
    return '<div class="log-entry">' +
      '<span class="log-col-time" title="' + escapeHtml(time) + '">' + time + '</span>' +
      '<span class="log-col-domain" title="' + escapeHtml(entry.domain) + '">' + escapeHtml(entry.domain) + '</span>' +
      '<span class="log-col-action ' + cls + '">' + entry.action + '</span>' +
      '<span class="log-col-method" title="' + escapeHtml(entry.method) + '">' + escapeHtml(entry.method) + '</span>' +
      '<span class="log-col-detail" title="' + escapeHtml(entry.detail) + '">' + escapeHtml(entry.detail) + '</span>' +
      '</div>';
  }).join('');
}

async function loadDevInfo() {
  const container = document.getElementById('devInfo');
  if (!currentDomain) {
    container.innerHTML = '<div class="dev-row"><span class="dev-label">Status</span><span class="dev-value">' +
      chrome.i18n.getMessage('popupDevStatusOpen') + '</span></div>';
    return;
  }

  const response = await sendMessage({ type: 'getDevInfo', domain: currentDomain });
  if (!response || !response.success || !response.info) {
    container.innerHTML = '<div class="dev-row"><span class="dev-label">Status</span><span class="dev-value">' +
      chrome.i18n.getMessage('popupDevStatusNoBanner') + '</span></div>';
    return;
  }

  const info = response.info;
  const resultStr = typeof info.resultDetail === 'object'
    ? JSON.stringify(info.resultDetail)
    : String(info.resultDetail || '-');

  var i18n = chrome.i18n.getMessage;
  var rows = [
    { label: i18n('popupLogHeaderDomain'), value: currentDomain },
    { label: i18n('popupDevLabelProvider'), value: info.provider || 'unknown' },
    { label: i18n('popupDevLabelDetection'), value: info.detectionMethod || 'none' },
    { label: i18n('popupDevLabelContainer'), value: info.containerInfo || '-' },
    { label: i18n('popupDevLabelAction'), value: info.action || '-' },
    { label: i18n('popupDevLabelResult'), value: resultStr },
    { label: i18n('popupDevLabelLastSeen'), value: info.timestamp ? formatTime(info.timestamp) : '-' }
  ];

  container.innerHTML = rows.map(function (r) {
    return '<div class="dev-row">' +
      '<span class="dev-label">' + escapeHtml(r.label) + '</span>' +
      '<span class="dev-value">' + escapeHtml(r.value) + '</span>' +
      '</div>';
  }).join('');
}

async function loadSelectorList() {
  const response = await sendMessage({ type: 'getSelectorList' });
  const container = document.getElementById('selectorList');

  if (!response || !response.success || !response.providers) {
    container.innerHTML = '<div class="sl-empty">' + chrome.i18n.getMessage('popupSelectorEmpty') + '</div>';
    return;
  }

  container.innerHTML = response.providers.map((p, i) => {
    const sel = p.selectors;
    const fields = [
      ['container', sel.container],
      ['rejectAll', sel.rejectAll],
      ['settings', sel.settings],
      ['saveSettings', sel.saveSettings],
      ['acceptAll', sel.acceptAll]
    ].filter(function (f) { return f[1]; });

    var fieldHtml = fields.map(function (f) {
      return '<div class="selector-field">' +
        '<span class="selector-field-label">' + escapeHtml(f[0]) + '</span>' +
        '<code class="selector-field-value">' + escapeHtml(f[1]) + '</code>' +
        '</div>';
    }).join('');

    var headerRight = '';
    if (p.url) {
      headerRight = '<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer" class="prov-link" title="' + escapeHtml(p.name) + ' website">&#8599;</a>';
    }

    return '<div class="selector-provider">' +
      '<div class="selector-provider-header" data-index="' + i + '" title="Click to expand">' +
        '<span class="prov-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="prov-actions">' +
          '<span class="prov-chevron">&#9654;</span>' +
          headerRight +
        '</span>' +
      '</div>' +
      '<div class="selector-provider-body">' + fieldHtml + '</div>' +
      '</div>';
  }).join('');

  container.querySelectorAll('.selector-provider-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var provider = header.parentElement;
      var wasOpen = provider.classList.contains('open');
      provider.classList.toggle('open');
      var chevron = header.querySelector('.prov-chevron');
      if (chevron) {
        chevron.innerHTML = wasOpen ? '&#9654;' : '&#9660;';
      }
    });
  });
}

async function copyLogToClipboard() {
  var response = await sendMessage({ type: 'getActionLog' });
  if (!response || !response.success || !response.log || !response.log.length) {
    showToast(chrome.i18n.getMessage('popupToastLogNoEntries'));
    return;
  }

  var i18n = chrome.i18n.getMessage;
  var lines = response.log.map(function (entry, i) {
    var time = new Date(entry.timestamp).toLocaleString();
    return (i + 1) + '. [' + time + '] ' + entry.domain + ' \u2014 ' + entry.action + ' (' + entry.method + ') \u00BB ' + entry.detail;
  });

  var header = 'KoalaCookies Action Log \u2014 ' + new Date().toLocaleDateString() + '\n' + '\u2500'.repeat(50) + '\n';
  var text = header + lines.join('\n') + '\n';
  try {
    await navigator.clipboard.writeText(text);
    showToast(i18n('popupToastLogCopied'));
  } catch (e) {
    showToast(i18n('popupToastLogCopyFailed', [e.message]));
  }
}

async function startPicker() {
  var result = await sendMessage({ type: 'startPicker' });
  if (result && result.success) {
    window.close();
  } else {
    showToast(chrome.i18n.getMessage('popupToastPickerFailed', [(result && result.error) || 'unknown']));
  }
}

async function loadCustomSelectors() {
  var resp = await sendMessage({ type: 'getCustomSelectors' });
  var selectors = (resp && resp.selectors) || [];
  document.getElementById('customSelectorCount').textContent = selectors.length;

  var list = document.getElementById('customSelectorList');
  if (!selectors.length) {
    list.innerHTML = '<div class="cs-empty">' + chrome.i18n.getMessage('popupCustomSelectorsEmpty') + '</div>';
    return;
  }

  list.innerHTML = selectors.map(function (s, i) {
    var label = s.profile.tagName;
    if (s.profile.id) label += '#' + s.profile.id;
    else if (s.profile.className) label += '.' + s.profile.className.split(' ')[0];

    return '<div class="custom-selector-entry">' +
      '<div class="cs-domain">' + escapeHtml(s.domain) + '</div>' +
      '<code class="cs-selector">' + escapeHtml(label) + '</code>' +
      '<button class="cs-remove" data-index="' + i + '" title="Remove">\u00D7</button>' +
      '</div>';
  }).join('');

  list.querySelectorAll('.cs-remove').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var idx = parseInt(btn.dataset.index, 10);
      await sendMessage({ type: 'removeCustomSelector', index: idx });
      loadCustomSelectors();
    });
  });
}

async function toggleWhitelistList() {
  var section = document.getElementById('whitelistSection');
  if (section.style.display === 'none') {
    var response = await sendMessage({ type: 'getSettings' });
    var whitelist = (response && response.settings && response.settings.whitelist) || [];
    var list = document.getElementById('whitelistEntries');

    if (!whitelist.length) {
      list.innerHTML = '<li class="wl-empty">' + chrome.i18n.getMessage('popupWhitelistEmpty') + '</li>';
    } else {
      list.innerHTML = whitelist.map(function (d) {
        return '<li class="wl-entry">' +
          '<span class="wl-domain">' + escapeHtml(d) + '</span>' +
          '<button class="wl-remove" data-domain="' + escapeHtml(d) + '" title="Remove">\u00D7</button>' +
          '</li>';
      }).join('');

      list.querySelectorAll('.wl-remove').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          await sendMessage({ type: 'enableDomain', domain: btn.dataset.domain });
          toggleWhitelistList();
          updateDisableButton();
        });
      });
    }
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
}

async function onModeChange(e) {
  const mode = e.target.value;
  await sendMessage({ type: 'setMode', mode });
  showToast(chrome.i18n.getMessage('popupToastModeUpdated'));
}

async function onResetStats() {
  if (confirm(chrome.i18n.getMessage('popupConfirmReset'))) {
    await sendMessage({ type: 'resetStats' });
    await loadStats();
    showToast(chrome.i18n.getMessage('popupToastStatsReset'));
  }
}

async function onToggleWhitelist() {
  // kept for backward compatibility with double-click whitelist list
}

function toggleDisableDropdown() {
  var menu = document.getElementById('disableDropdownMenu');
  if (menu.style.display === 'none' || !menu.style.display) {
    menu.style.display = 'block';
  } else {
    menu.style.display = 'none';
  }
}

async function onDisableDomain(durationMs) {
  if (!currentDomain) return;
  document.getElementById('disableDropdownMenu').style.display = 'none';
  await sendMessage({ type: 'disableDomain', domain: currentDomain, durationMs: durationMs });
  await updateDisableButton();
  await updateDomainStatus();
}

async function onEnableDomain() {
  if (!currentDomain) return;
  await sendMessage({ type: 'enableDomain', domain: currentDomain });
  await updateDisableButton();
  await updateDomainStatus();
}

async function updateDisableButton() {
  var response = await sendMessage({ type: 'getSettings' });
  if (!response || !response.success) return;

  var whitelist = response.settings.whitelist || [];
  var disabledUntil = response.settings.disabledUntil || {};
  var isPermanent = whitelist.includes(currentDomain);
  var until = disabledUntil[currentDomain];
  var isTemporary = until && Date.now() < until;

  var enableBtn = document.getElementById('enableDomainBtn');
  var dropdown = document.getElementById('disableDropdown');

  if (isPermanent || isTemporary) {
    dropdown.style.display = 'none';
    enableBtn.style.display = 'inline-block';
    var statusText;
    if (isPermanent) {
      statusText = chrome.i18n.getMessage('popupDisableStatusPermanent');
    } else {
      var remaining = Math.ceil((until - Date.now()) / 60000);
      if (remaining > 60) {
        remaining = Math.ceil(remaining / 60);
        statusText = chrome.i18n.getMessage('popupDisableStatusTemporaryHr', [String(remaining)]);
      } else {
        statusText = chrome.i18n.getMessage('popupDisableStatusTemporaryMin', [String(remaining)]);
      }
    }
    document.getElementById('disableStatus').textContent = statusText;
  } else {
    dropdown.style.display = 'block';
    enableBtn.style.display = 'none';
  }
}

async function updateDomainStatus() {
  const statusEl = document.getElementById('domainStatus');
  if (!currentDomain) return;

  const popupData = await sendMessage({ type: 'getPopupData' });
  if (!popupData || !popupData.success) return;
  const whitelist = popupData.settings.whitelist || [];
  const disabledUntil = popupData.settings.disabledUntil || {};

  var isDisabled = whitelist.includes(currentDomain);
  var until = disabledUntil[currentDomain];
  if (!isDisabled && until && Date.now() < until) {
    isDisabled = true;
  }

  if (isDisabled) {
    statusEl.className = 'domain-status status-disabled';
    statusEl.querySelector('.status-icon').textContent = '\uD83D\uDEAB';
    statusEl.querySelector('.status-text').textContent =
      chrome.i18n.getMessage('popupStatusWhitelisted');
  } else {
    const domainStats = popupData.stats.byDomain?.[currentDomain];
    if (domainStats && domainStats.detected > 0) {
      if (domainStats.rejected > 0) {
        statusEl.className = 'domain-status status-success';
        statusEl.querySelector('.status-icon').textContent = '\u2705';
        statusEl.querySelector('.status-text').textContent =
          chrome.i18n.getMessage('popupStatusBannerRejected', [String(domainStats.rejected)]);
      } else if (domainStats.hidden > 0) {
        statusEl.className = 'domain-status status-info';
        statusEl.querySelector('.status-icon').textContent = '\uD83D\uDC7B';
        statusEl.querySelector('.status-text').textContent =
          chrome.i18n.getMessage('popupStatusBannerHidden');
      } else if (domainStats.skipped > 0) {
        statusEl.className = 'domain-status status-warning';
        statusEl.querySelector('.status-icon').textContent = '\u26A0\uFE0F';
        statusEl.querySelector('.status-text').textContent =
          chrome.i18n.getMessage('popupStatusBannerSkipped');
      }
    } else {
      statusEl.className = 'domain-status status-neutral';
      statusEl.querySelector('.status-icon').textContent = '\uD83D\uDD0D';
      statusEl.querySelector('.status-text').textContent =
        chrome.i18n.getMessage('popupStatusNoBanner');
    }
  }
}

let toastTimeout = null;
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.remove(), 2000);
}

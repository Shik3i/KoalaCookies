let currentDomain = '';

document.addEventListener('DOMContentLoaded', () => init().catch(console.error));

async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    try {
      const url = new URL(tabs[0].url);
      currentDomain = url.hostname;
      document.getElementById('currentDomain').textContent = currentDomain;
    } catch {
      document.getElementById('currentDomain').textContent = chrome.i18n.getMessage('popupUnavailable');
    }
  }

  await loadPopupData();

  document.getElementById('modeSelect').addEventListener('change', onModeChange);
  document.getElementById('resetStatsBtn').addEventListener('click', onResetStats);
  document.getElementById('whitelistBtn').addEventListener('click', onToggleWhitelist);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  await updateWhitelistButton();
  await updateDomainStatus();
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
  if (tabName === 'dev') loadDevInfo();
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
  return div.innerHTML;
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
      chrome.i18n.getMessage('popupDevOpenPage') + '</span></div>';
    return;
  }

  const response = await sendMessage({ type: 'getDevInfo', domain: currentDomain });
  if (!response || !response.success || !response.info) {
    container.innerHTML = '<div class="dev-row"><span class="dev-label">Status</span><span class="dev-value">' +
      chrome.i18n.getMessage('popupDevNoBanner') + '</span></div>';
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

async function onModeChange(e) {
  const mode = e.target.value;
  await sendMessage({ type: 'setMode', mode });
  showToast(chrome.i18n.getMessage('popupToastModeUpdated'));
}

async function onResetStats() {
  if (confirm('Reset all statistics? This cannot be undone.')) {
    await sendMessage({ type: 'resetStats' });
    await loadStats();
    showToast(chrome.i18n.getMessage('popupToastStatsReset'));
  }
}

async function onToggleWhitelist() {
  if (!currentDomain) return;

  const response = await sendMessage({ type: 'getSettings' });
  if (!response || !response.success) return;

  const whitelist = response.settings.whitelist || [];
  const isWhitelisted = whitelist.includes(currentDomain);

  if (isWhitelisted) {
    await sendMessage({ type: 'removeFromWhitelist', domain: currentDomain });
    showToast(chrome.i18n.getMessage('popupToastRemovedWhitelist'));
  } else {
    await sendMessage({ type: 'addToWhitelist', domain: currentDomain });
    showToast(chrome.i18n.getMessage('popupToastAddedWhitelist'));
  }

  await updateWhitelistButton();
  await updateDomainStatus();
}

async function updateWhitelistButton() {
  const response = await sendMessage({ type: 'getSettings' });
  if (!response || !response.success) return;

  const whitelist = response.settings.whitelist || [];
  const isWhitelisted = whitelist.includes(currentDomain);
  const btn = document.getElementById('whitelistBtn');
  const actionSpan = document.getElementById('whitelistAction');

  if (isWhitelisted) {
    actionSpan.textContent = chrome.i18n.getMessage('popupWhitelistRemove');
    btn.classList.add('btn-warning');
  } else {
    actionSpan.textContent = chrome.i18n.getMessage('popupWhitelistAdd');
    btn.classList.remove('btn-warning');
  }
}

async function updateDomainStatus() {
  const statusEl = document.getElementById('domainStatus');
  if (!currentDomain) return;

  const popupData = await sendMessage({ type: 'getPopupData' });
  if (!popupData || !popupData.success) return;
  const whitelist = popupData.settings.whitelist || [];

  if (whitelist.includes(currentDomain)) {
    statusEl.className = 'domain-status status-disabled';
    statusEl.querySelector('.status-icon').textContent = '🚫';
    statusEl.querySelector('.status-text').textContent =
      chrome.i18n.getMessage('popupStatusWhitelisted');
  } else {
    const domainStats = popupData.stats.byDomain?.[currentDomain];
    if (domainStats && domainStats.detected > 0) {
      if (domainStats.rejected > 0) {
        statusEl.className = 'domain-status status-success';
        statusEl.querySelector('.status-icon').textContent = '✅';
        statusEl.querySelector('.status-text').textContent =
          chrome.i18n.getMessage('popupStatusBannerRejected', [String(domainStats.rejected)]);
      } else if (domainStats.hidden > 0) {
        statusEl.className = 'domain-status status-info';
        statusEl.querySelector('.status-icon').textContent = '👻';
        statusEl.querySelector('.status-text').textContent =
          chrome.i18n.getMessage('popupStatusBannerHidden');
      } else if (domainStats.skipped > 0) {
        statusEl.className = 'domain-status status-warning';
        statusEl.querySelector('.status-icon').textContent = '⚠️';
        statusEl.querySelector('.status-text').textContent =
          chrome.i18n.getMessage('popupStatusBannerSkipped');
      }
    } else {
      statusEl.className = 'domain-status status-neutral';
      statusEl.querySelector('.status-icon').textContent = '🔍';
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

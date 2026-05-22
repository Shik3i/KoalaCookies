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

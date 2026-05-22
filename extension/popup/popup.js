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
      document.getElementById('currentDomain').textContent = 'Unavailable';
    }
  }

  await loadStats();
  await loadSettings();

  document.getElementById('modeSelect').addEventListener('change', onModeChange);
  document.getElementById('resetStatsBtn').addEventListener('click', onResetStats);
  document.getElementById('whitelistBtn').addEventListener('click', onToggleWhitelist);

  await updateWhitelistButton();
  await updateDomainStatus();
}

async function loadStats() {
  const response = await chrome.runtime.sendMessage({ type: 'getStats' });
  if (response && response.success) {
    const s = response.stats;
    document.getElementById('statDetected').textContent = s.totalDetected || 0;
    document.getElementById('statRejected').textContent = s.totalRejected || 0;
    document.getElementById('statSkipped').textContent = s.totalSkipped || 0;
    document.getElementById('statHidden').textContent = s.totalHidden || 0;
  }
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
  if (response && response.success) {
    document.getElementById('modeSelect').value = response.settings.mode || 'gentle';
  }
}

async function onModeChange(e) {
  const mode = e.target.value;
  await chrome.runtime.sendMessage({ type: 'setMode', mode });
  showToast('Mode updated');
}

async function onResetStats() {
  if (confirm('Reset all statistics? This cannot be undone.')) {
    await chrome.runtime.sendMessage({ type: 'resetStats' });
    await loadStats();
    showToast('Statistics reset');
  }
}

async function onToggleWhitelist() {
  if (!currentDomain) return;

  const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
  if (!response || !response.success) return;

  const whitelist = response.settings.whitelist || [];
  const isWhitelisted = whitelist.includes(currentDomain);

  if (isWhitelisted) {
    await chrome.runtime.sendMessage({ type: 'removeFromWhitelist', domain: currentDomain });
    showToast('Removed from whitelist');
  } else {
    await chrome.runtime.sendMessage({ type: 'addToWhitelist', domain: currentDomain });
    showToast('Added to whitelist');
  }

  await updateWhitelistButton();
  await updateDomainStatus();
}

async function updateWhitelistButton() {
  const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
  if (!response || !response.success) return;

  const whitelist = response.settings.whitelist || [];
  const isWhitelisted = whitelist.includes(currentDomain);
  const btn = document.getElementById('whitelistBtn');
  const actionSpan = document.getElementById('whitelistAction');

  if (isWhitelisted) {
    actionSpan.textContent = 'Remove from';
    btn.classList.add('btn-warning');
  } else {
    actionSpan.textContent = 'Add to';
    btn.classList.remove('btn-warning');
  }
}

async function updateDomainStatus() {
  const statusEl = document.getElementById('domainStatus');
  if (!currentDomain) return;

  const response = await chrome.runtime.sendMessage({ type: 'getStats' });
  if (!response || !response.success) return;

  const whitelistResponse = await chrome.runtime.sendMessage({ type: 'getSettings' });
  const whitelist = whitelistResponse.settings.whitelist || [];

  if (whitelist.includes(currentDomain)) {
    statusEl.className = 'domain-status status-disabled';
    statusEl.querySelector('.status-icon').textContent = '🚫';
    statusEl.querySelector('.status-text').textContent = 'Whitelisted - No action';
  } else {
    const domainStats = response.stats.byDomain?.[currentDomain];
    if (domainStats && domainStats.detected > 0) {
      if (domainStats.rejected > 0) {
        statusEl.className = 'domain-status status-success';
        statusEl.querySelector('.status-icon').textContent = '✅';
        statusEl.querySelector('.status-text').textContent =
          `Banner rejected (${domainStats.rejected} time(s))`;
      } else if (domainStats.hidden > 0) {
        statusEl.className = 'domain-status status-info';
        statusEl.querySelector('.status-icon').textContent = '👻';
        statusEl.querySelector('.status-text').textContent =
          'Banner hidden';
      } else if (domainStats.skipped > 0) {
        statusEl.className = 'domain-status status-warning';
        statusEl.querySelector('.status-icon').textContent = '⚠️';
        statusEl.querySelector('.status-text').textContent =
          'Banner skipped - Manual action needed';
      }
    } else {
      statusEl.className = 'domain-status status-neutral';
      statusEl.querySelector('.status-icon').textContent = '🔍';
      statusEl.querySelector('.status-text').textContent = 'No banner detected yet';
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

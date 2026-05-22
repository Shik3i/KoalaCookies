var TIMING = {
  DEBOUNCE_MS: 300,
  INITIAL_SCAN_DELAY: 500,
  OBSERVER_SETUP_DELAY: 600,
  DOM_LOADED_SCAN_DELAY: 800,
  DOM_LOADED_OBSERVER_DELAY: 1000,
  SPA_NAV_DELAY: 300,
  IFRAME_LOAD_DELAY: 300,
  IFRAME_OBSERVER_DELAY: 400,
  REJECT_RETRY_DELAY: 500,
  SETTINGS_PANEL_TIMEOUT: 5000
};

var bannerObserver = null;
var processed = false;
var debounceTimer = null;
var lastUrl = location.href;

function isValidPage() {
  const protocol = window.location.protocol;
  return protocol === 'http:' || protocol === 'https:';
}

async function processPage() {
  if (processed) return;
  if (!isValidPage()) return;
  processed = true;

  const settings = await Storage.getSettings();
  const whitelist = settings.whitelist || [];
  const disabledUntil = settings.disabledUntil || {};
  const mode = settings.mode || 'gentle';
  const domain = window.location.hostname;

  if (whitelist.includes(domain)) {
    chrome.runtime.sendMessage({ type: 'bannerDisabled', domain: domain }).catch(function(){});
    return;
  }

  var until = disabledUntil[domain];
  if (until && Date.now() < until) {
    chrome.runtime.sendMessage({ type: 'bannerDisabled', domain: domain }).catch(function(){});
    return;
  }

  const bannerResult = await detectBanner();

  if (!bannerResult) {
    processed = false;
    return;
  }

  if (!bannerResult.container || !isVisible(bannerResult.container, false)) {
    processed = false;
    return;
  }

  let result;

  var rejectResult = clickRejectAll(bannerResult);
  if (rejectResult) {
    result = { action: 'rejected', detail: rejectResult };
  } else {
    var retryResult = await _retryReject(bannerResult);
    if (retryResult) {
      result = { action: 'rejected', detail: retryResult };
    } else {
      var settingsResult = await clickSettingsAndRejectAll(bannerResult);
      if (settingsResult) {
        result = { action: 'rejected', detail: settingsResult };
      } else if (mode === 'aggressive') {
        hideBanner(bannerResult);
        result = { action: 'hidden', detail: 'Banner hidden (aggressive mode)' };
      } else {
        result = { action: 'skipped', detail: 'No reject button found, banner left visible' };
      }
    }
  }

  chrome.runtime.sendMessage({
    type: 'bannerResult',
    domain: domain,
    action: result.action,
    detail: result.detail,
    provider: bannerResult.provider,
    detectionMethod: bannerResult.method,
    containerInfo: getContainerInfo(bannerResult.container)
  }).catch(() => {});

  showPageIndicator(result);
}

var INDICATOR_COLORS = {
  rejected: '#2e7d32',
  hidden: '#1565c0',
  skipped: '#f57c00'
};

var INDICATOR_LABELS = {
  rejected: '✓',
  hidden: '✕',
  skipped: '!'
};

function showPageIndicator(result) {
  try {
    if (window.self !== window.top) return;

    var oldIndicator = document.getElementById('__koala_indicator');
    if (oldIndicator) oldIndicator.remove();

    var color = INDICATOR_COLORS[result.action] || '#9e9e9e';
    var label = INDICATOR_LABELS[result.action] || '';

    var el = document.createElement('div');
    el.id = '__koala_indicator';
    el.style.cssText = [
      'position:fixed;bottom:16px;right:16px;z-index:2147483646',
      'width:28px;height:28px;border-radius:50%',
      'background:' + color + ';color:#fff',
      'display:flex;align-items:center;justify-content:center',
      'font-size:14px;font-weight:bold;font-family:sans-serif',
      'opacity:0;transition:opacity 0.3s ease',
      'pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.2)'
    ].join(';');
    el.textContent = label;

    document.body.appendChild(el);
    requestAnimationFrame(function() { el.style.opacity = '0.9'; });

    setTimeout(function() {
      el.style.opacity = '0';
      setTimeout(function() { if (el.parentNode) el.remove(); }, 300);
    }, 3000);
  } catch (e) {}
}

function getContainerInfo(container) {
  if (!container) return '';
  const tag = container.tagName.toLowerCase();
  const id = container.id ? '#' + container.id : '';
  const classes = container.className && typeof container.className === 'string'
    ? '.' + container.className.trim().split(/\s+/).slice(0, 3).join('.')
    : '';
  return tag + id + classes;
}

async function _retryReject(bannerResult) {
  await new Promise(function(r) { setTimeout(r, TIMING.REJECT_RETRY_DELAY); });
  var retry = clickRejectAll(bannerResult);
  if (retry) return retry;
  return null;
}

function setupObserver() {
  if (bannerObserver) {
    bannerObserver.disconnect();
  }

  bannerObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      processed = false;
      lastUrl = location.href;
    }
    if (processed) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processPage().catch(console.error);
    }, TIMING.DEBOUNCE_MS);
  });

  function doObserve() {
    if (document.body) {
      bannerObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      requestAnimationFrame(doObserve);
    }
  }
  doObserve();
}

function start() {
  window.addEventListener('popstate', () => {
    processed = false;
    lastUrl = location.href;
    setTimeout(processPage, TIMING.SPA_NAV_DELAY);
  });

  var isTopFrame = (window.self === window.top);

  if (isTopFrame) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(processPage, TIMING.DOM_LOADED_SCAN_DELAY);
        setTimeout(setupObserver, TIMING.DOM_LOADED_OBSERVER_DELAY);
      });
    } else {
      setTimeout(processPage, TIMING.INITIAL_SCAN_DELAY);
      setTimeout(setupObserver, TIMING.OBSERVER_SETUP_DELAY);
    }
  } else {
    window.addEventListener('load', () => {
      processed = false;
      lastUrl = location.href;
      setTimeout(processPage, TIMING.IFRAME_LOAD_DELAY);
      setTimeout(setupObserver, TIMING.IFRAME_OBSERVER_DELAY);
    });

    if (document.readyState !== 'loading') {
      setTimeout(processPage, TIMING.IFRAME_LOAD_DELAY);
      setTimeout(setupObserver, TIMING.IFRAME_OBSERVER_DELAY);
    }
  }
}

start();

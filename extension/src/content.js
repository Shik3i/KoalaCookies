let bannerObserver = null;
let processed = false;
let debounceTimer = null;
let lastUrl = location.href;

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
  const mode = settings.mode || 'gentle';
  const domain = window.location.hostname;

  if (whitelist.includes(domain)) {
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

  const rejectResult = clickRejectAll(bannerResult);
  if (rejectResult) {
    result = { action: 'rejected', detail: rejectResult };
  } else {
    const settingsResult = await clickSettingsAndRejectAll(bannerResult);
    if (settingsResult) {
      result = { action: 'rejected', detail: settingsResult };
    } else if (mode === 'aggressive') {
      hideBanner(bannerResult);
      result = { action: 'hidden', detail: 'Banner hidden (aggressive mode)' };
    } else {
      result = { action: 'skipped', detail: 'No reject button found, banner left visible' };
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
    }, 500);
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
    setTimeout(processPage, 300);
  });

  var isTopFrame = (window.self === window.top);

  if (isTopFrame) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(processPage, 800);
        setTimeout(setupObserver, 1000);
      });
    } else {
      setTimeout(processPage, 500);
      setTimeout(setupObserver, 600);
    }
  } else {
    window.addEventListener('load', () => {
      processed = false;
      lastUrl = location.href;
      setTimeout(processPage, 300);
      setTimeout(setupObserver, 400);
    });

    if (document.readyState !== 'loading') {
      setTimeout(processPage, 300);
      setTimeout(setupObserver, 400);
    }
  }
}

start();

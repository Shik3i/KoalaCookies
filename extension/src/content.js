let bannerObserver = null;
let processed = false;
let debounceTimer = null;

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

  if (!bannerResult.container || !isVisible(bannerResult.container)) {
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
    if (processed) {
      bannerObserver.disconnect();
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processPage().catch(console.error);
    }, 500);
  });

  if (document.body) {
    bannerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

function start() {
  // document_idle guarantees readyState is complete, kept as safety fallback
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(processPage, 800);
      setTimeout(setupObserver, 1000);
    });
  } else {
    setTimeout(processPage, 500);
    setTimeout(setupObserver, 600);
  }
}

start();

let bannerObserver = null;

async function processPage() {
  const settings = await Storage.getSettings();
  const whitelist = settings.whitelist || [];
  const mode = settings.mode || 'gentle';
  const domain = window.location.hostname;

  if (whitelist.includes(domain)) {
    return;
  }

  const bannerResult = detectBanner();

  if (!bannerResult) {
    return;
  }

  await Storage.updateStats(domain, { detected: true });

  const result = handleBanner(bannerResult, mode);

  chrome.runtime.sendMessage({
    type: 'bannerResult',
    domain: domain,
    action: result.action,
    detail: result.detail
  }).catch(() => {});

  if (result.action === 'rejected') {
    await Storage.updateStats(domain, { rejected: true });
  } else if (result.action === 'hidden') {
    await Storage.updateStats(domain, { hidden: true });
  } else if (result.action === 'skipped') {
    await Storage.updateStats(domain, { skipped: true });
  }
}

function setupObserver() {
  if (bannerObserver) {
    bannerObserver.disconnect();
  }

  bannerObserver = new MutationObserver(() => {
    processPage();
  });

  bannerObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  const shadowRoots = findShadowRoots(document.documentElement);
  for (const root of shadowRoots) {
    bannerObserver.observe(root, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(processPage, 1000);
    setupObserver();
  });
} else {
  setTimeout(processPage, 500);
  setupObserver();
}

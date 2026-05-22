function detectBannerViaSelectors() {
  for (const [provider, selectors] of Object.entries(BANNER_SELECTORS)) {
    const container = document.querySelector(selectors.container);
    if (container && isVisible(container)) {
      return { provider, container, selectors };
    }
  }
  return null;
}

function isVisible(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         element.offsetWidth > 0 &&
         element.offsetHeight > 0;
}

function detectBannerByKeywords() {
  const keywords = [
    'cookie', 'cookies',
    'consent', 'zustimmung',
    'datenschutz', 'privacy',
    'dsgvo', 'gdpr',
    'tracking', 'verfolgung',
    'personal data', 'personenbezogene',
    'cookie policy', 'cookie-richtlinie'
  ];

  const lowerKeywords = keywords.map(k => k.toLowerCase());

  const candidateTags = document.querySelectorAll(
    'div[class*="cookie" i], div[id*="cookie" i], ' +
    'div[class*="consent" i], div[id*="consent" i], ' +
    'div[class*="banner" i], div[id*="banner" i], ' +
    'div[class*="notice" i], div[id*="notice" i], ' +
    'aside, dialog, section, footer'
  );

  for (const el of candidateTags) {
    if (!isVisible(el)) continue;

    const text = (el.textContent || '').toLowerCase();
    const matchCount = lowerKeywords.filter(k => text.includes(k)).length;

    if (matchCount >= 2) {
      const rect = el.getBoundingClientRect();
      const viewportRatio = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);

      if (viewportRatio < 0.6) {
        return el;
      }
    }
  }

  const fixedElements = document.querySelectorAll(
    'div[style*="position: fixed" i], div[style*="position:fixed" i], ' +
    'div[style*="z-index:" i]'
  );

  for (const el of fixedElements) {
    if (!isVisible(el)) continue;
    const text = (el.textContent || '').toLowerCase();
    const matchCount = lowerKeywords.filter(k => text.includes(k)).length;

    if (matchCount >= 2) {
      return el;
    }
  }

  return null;
}

function findShadowRoots(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: function(node) {
      return node.shadowRoot ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });

  const roots = [];
  let node;
  while ((node = walker.nextNode())) {
    roots.push(node.shadowRoot);
    roots.push(...findShadowRoots(node.shadowRoot));
  }
  return roots;
}

async function getCustomSelectors() {
  const data = await Storage.get('customSelectors');
  return data || [];
}

async function detectBannerViaCustomSelectors() {
  const customs = await getCustomSelectors();
  if (!customs.length) return null;

  for (const cs of customs) {
    const p = cs.profile;

    let selector = p.tagName;
    if (p.id) {
      selector += '#' + p.id;
    } else if (p.className) {
      const firstClass = p.className.split(' ')[0];
      if (firstClass && firstClass.length > 1) selector += '.' + CSS.escape(firstClass);
    }

    try {
      const container = document.querySelector(selector);
      if (!container || !isVisible(container)) continue;

      return {
        container,
        provider: 'custom',
        selectors: { container: selector, rejectAll: null, settings: null, saveSettings: null, acceptAll: null },
        method: 'custom_selector'
      };
    } catch { continue; }
  }
  return null;
}

async function detectBanner() {
  const customResult = await detectBannerViaCustomSelectors();
  if (customResult) return customResult;

  const selectorResult = detectBannerViaSelectors();
  if (selectorResult) {
    return {
      container: selectorResult.container,
      provider: selectorResult.provider,
      selectors: selectorResult.selectors,
      method: 'selector'
    };
  }

  const keywordResult = detectBannerByKeywords();
  if (keywordResult) {
    return {
      container: keywordResult,
      provider: 'unknown',
      selectors: null,
      method: 'keyword'
    };
  }

  const shadowRoots = findShadowRoots(document.documentElement);
  for (const shadowRoot of shadowRoots) {
    for (const [provider, selectors] of Object.entries(BANNER_SELECTORS)) {
      const container = shadowRoot.querySelector(selectors.container);
      if (container && isVisible(container)) {
        return {
          container: container,
          provider: provider,
          selectors: selectors,
          method: 'shadow_selector'
        };
      }
    }
  }

  return null;
}

const BANNER_SELECTORS = {
  onetrust: {
    container: '#onetrust-banner-sdk',
    rejectAll: '#onetrust-reject-all-handler, .ot-sdk-row button[aria-label*="reject" i]',
    settings: '#onetrust-pc-btn-handler',
    saveSettings: '.save-preference-btn-handler',
    acceptAll: '#onetrust-accept-btn-handler'
  },
  cookiebot: {
    container: '#CybotCookiebotDialog',
    rejectAll: '#CybotCookiebotDialogBodyButtonDecline',
    settings: '#CybotCookiebotDialogBodyLevelButtonCustomize',
    acceptAll: '#CybotCookiebotDialogBodyLevelButtonAccept'
  },
  usercentrics: {
    container: '#usercentrics-root',
    rejectAll: '[data-testid="uc-deny-all-button"], button[aria-label*="reject" i]',
    settings: '[data-testid="uc-more-button"], button[aria-label*="settings" i]',
    saveSettings: '[data-testid="uc-save-button"]',
    acceptAll: '[data-testid="uc-accept-all-button"]'
  },
  quantcast: {
    container: '#qc-cmp2-ui, #qcCmpUi',
    rejectAll: 'button[aria-label*="reject" i], button[aria-label*="disagree" i], .qc-cmp-button[onclick*="reject"]',
    settings: 'button[aria-label*="options" i], button[aria-label*="settings" i], .qc-cmp-button[onclick*="options"]',
    saveSettings: 'button[aria-label*="save" i]',
    acceptAll: 'button[aria-label*="accept" i], button[aria-label*="agree" i]'
  },
  sourcepoint: {
    container: '#sp_message_container, .sp_veil, .message-container',
    rejectAll: 'button[aria-label*="reject" i], button[title*="reject" i], .sp_choice_type_11, .reject-all',
    settings: 'button[aria-label*="options" i], button[title*="options" i], .sp_choice_type_12',
    saveSettings: 'button[aria-label*="save" i]',
    acceptAll: 'button[aria-label*="accept" i], .sp_choice_type_13'
  },
  cookieconsent: {
    container: '.cc-banner, .cc-window, .cc-revoke, .cc-floating',
    rejectAll: '.cc-deny, .cc-btn[aria-label*="deny" i]',
    acceptAll: '.cc-allow, .cc-btn[aria-label*="allow" i]'
  },
  fundingchoices: {
    container: '#fc-consent-root, .fc-consent-root',
    rejectAll: 'button[aria-label*="reject" i], button[aria-label*="object" i]',
    settings: 'button[aria-label*="options" i], button[aria-label*="customize" i]',
    saveSettings: 'button[aria-label*="confirm" i]',
    acceptAll: 'button[aria-label*="accept" i], button[aria-label*="agree" i], button[aria-label*="consent" i]'
  },
  didomi: {
    container: '#didomi-host',
    rejectAll: '.didomi-continue-without-agreeing, button[aria-label*="refuse" i], button[aria-label*="reject" i]',
    settings: '.didomi-learn-more-button, button[aria-label*="learn" i], button[aria-label*="settings" i]',
    saveSettings: 'button[aria-label*="save" i]',
    acceptAll: '.didomi-consent-popup-actions button[id*="didomi-notice-agree"]'
  },
  klaro: {
    container: '.klaro, #klaro',
    rejectAll: 'button.cm-btn-danger, button.klaro-decline-all, .cookie-modal .cm-btn-danger',
    settings: 'button.cm-btn-info, button.klaro-settings',
    saveSettings: 'button.cm-btn-success',
    acceptAll: 'button.cm-btn-success.klaro-accept-all'
  },
  tarteaucitron: {
    container: '#tarteaucitronRoot, .tarteaucitron-alert',
    rejectAll: '#tarteaucitronAllDenied',
    settings: '#tarteaucitronServices',
    acceptAll: '#tarteaucitronAllAllowed'
  },
  ccm19: {
    container: '.ccm19-cookie-banner, #ccm19-banner',
    rejectAll: '.ccm19-decline-all, .ccm19__decline-all',
    settings: '.ccm19-configure, .ccm19__configure',
    saveSettings: '.ccm19-save, .ccm19__save',
    acceptAll: '.ccm19-accept-all, .ccm19__accept-all'
  },
  coinhive: {
    container: '.cookie-consent, .cookie-banner, .cookie-notice, .cookie-law',
    rejectAll: 'button[id*="reject" i], button[id*="decline" i], button[id*="refuse" i], button[id*="deny" i]',
    acceptAll: 'button[id*="accept" i], button[id*="agree" i], button[id*="allow" i]'
  }
};

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

  const bannerContainers = [];

  const candidateTags = document.querySelectorAll(
    'div[class*="cookie" i], div[id*="cookie" i], ' +
    'div[class*="consent" i], div[id*="consent" i], ' +
    'div[class*="banner" i], div[id*="banner" i], ' +
    'div[class*="notice" i], div[id*="notice" i], ' +
    'aside, dialog, section, footer'
  );

  const lowerKeywords = keywords.map(k => k.toLowerCase());

  for (const el of candidateTags) {
    if (!isVisible(el)) continue;

    const text = (el.textContent || '').toLowerCase();
    const matchCount = lowerKeywords.filter(k => text.includes(k)).length;

    if (matchCount >= 2) {
      const rect = el.getBoundingClientRect();
      const viewportRatio = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);

      if (viewportRatio < 0.6) {
        bannerContainers.push({ element: el, score: matchCount, rect });
      }
    }
  }

  if (bannerContainers.length > 0) {
    bannerContainers.sort((a, b) => b.score - a.score);
    return bannerContainers[0].element;
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

function detectBanner() {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectBanner, detectBannerViaSelectors, detectBannerByKeywords, BANNER_SELECTORS, findShadowRoots, isVisible };
}

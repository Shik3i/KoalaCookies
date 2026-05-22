function _urlMatches(provider) {
  if (!provider.urlPattern || !provider.urlPattern.length) return true;
  var hostname = window.location.hostname;
  for (var i = 0; i < provider.urlPattern.length; i++) {
    try {
      if (new RegExp(provider.urlPattern[i]).test(hostname)) return true;
    } catch (e) { continue; }
  }
  return false;
}

function detectBannerViaSelectors() {
  var providers = RulesEngine.getProviders();
  for (var i = 0; i < providers.length; i++) {
    var provider = providers[i];
    if (!provider.selectors || !provider.selectors.container) continue;
    if (!_urlMatches(provider)) continue;
    var container = document.querySelector(provider.selectors.container);
    if (container && isVisible(container, false)) {
      return { provider: provider.id, container: container, selectors: provider.selectors };
    }
  }
  return null;
}

function isVisible(element, requireDimensions) {
  if (requireDimensions === undefined) requireDimensions = true;
  if (!element) return false;
  var style = getComputedStyle(element);
  var visible = style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0';
  if (!requireDimensions) return visible;
  return visible && element.offsetWidth > 0 && element.offsetHeight > 0;
}

function detectBannerByKeywords() {
  var keywords = RulesEngine.getDetectionKeywords();

  var lowerKeywords = keywords.map(function(k) { return k.toLowerCase(); });

  var candidateTags = document.querySelectorAll(
    'div[class*="cookie" i], div[id*="cookie" i], ' +
    'div[class*="consent" i], div[id*="consent" i], ' +
    'div[class*="banner" i], div[id*="banner" i], ' +
    'div[class*="notice" i], div[id*="notice" i], ' +
    'div[class*="cmp" i], div[id*="cmp" i], ' +
    'aside, dialog, section, footer'
  );

  for (var i = 0; i < candidateTags.length; i++) {
    var el = candidateTags[i];
    if (!isVisible(el)) continue;

    var text = (el.textContent || '').toLowerCase();
    var matchCount = 0;
    for (var k = 0; k < lowerKeywords.length; k++) {
      if (text.indexOf(lowerKeywords[k]) !== -1) matchCount++;
    }

    if (matchCount >= 2) {
      var rect = el.getBoundingClientRect();
      var viewportRatio = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);

      if (viewportRatio < 0.6) {
        return el;
      }
    }
  }

  var fixedElements = document.querySelectorAll(
    'div[style*="position: fixed" i], div[style*="position:fixed" i], ' +
    'div[style*="z-index:" i]'
  );

  for (var j = 0; j < fixedElements.length; j++) {
    var fel = fixedElements[j];
    if (!isVisible(fel)) continue;
    var ftext = (fel.textContent || '').toLowerCase();
    var fmatchCount = 0;
    for (var k2 = 0; k2 < lowerKeywords.length; k2++) {
      if (ftext.indexOf(lowerKeywords[k2]) !== -1) fmatchCount++;
    }

    if (fmatchCount >= 2) {
      return fel;
    }
  }

  return null;
}

function findShadowRoots(root) {
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: function(node) {
      return node.shadowRoot ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });

  var roots = [];
  var node;
  while ((node = walker.nextNode())) {
    roots.push(node.shadowRoot);
    var nested = findShadowRoots(node.shadowRoot);
    for (var i = 0; i < nested.length; i++) roots.push(nested[i]);
  }
  return roots;
}

async function getCustomSelectors() {
  var data = await Storage.get('customSelectors');
  return data || [];
}

async function detectBannerViaCustomSelectors() {
  var customs = await getCustomSelectors();
  if (!customs.length) return null;

  for (var i = 0; i < customs.length; i++) {
    var cs = customs[i];
    var p = cs.profile;

    var selector = p.tagName;
    if (p.id) {
      selector += '#' + CSS.escape(p.id);
    } else if (p.className) {
      var firstClass = p.className.split(' ')[0];
      if (firstClass && firstClass.length > 1) selector += '.' + CSS.escape(firstClass);
    }

    try {
      var container = document.querySelector(selector);
      if (!container || !isVisible(container, false)) continue;

      return {
        container: container,
        provider: 'custom',
        selectors: { container: selector, rejectAll: null, settings: null, saveSettings: null, acceptAll: null },
        method: 'custom_selector'
      };
    } catch (e) { continue; }
  }
  return null;
}

async function detectBanner() {
  var customResult = await detectBannerViaCustomSelectors();
  if (customResult) return customResult;

  await RulesEngine.ready();

  var selectorResult = detectBannerViaSelectors();
  if (selectorResult) {
    return {
      container: selectorResult.container,
      provider: selectorResult.provider,
      selectors: selectorResult.selectors,
      method: 'selector'
    };
  }

  var keywordResult = detectBannerByKeywords();
  if (keywordResult) {
    return {
      container: keywordResult,
      provider: 'unknown',
      selectors: null,
      method: 'keyword'
    };
  }

  var providers = RulesEngine.getProviders();
  var shadowRoots = findShadowRoots(document.documentElement);
  for (var s = 0; s < shadowRoots.length; s++) {
    var shadowRoot = shadowRoots[s];
    for (var p = 0; p < providers.length; p++) {
      var provider = providers[p];
      if (!provider.selectors || !provider.selectors.container) continue;
      if (!_urlMatches(provider)) continue;
      try {
        var shadowContainer = shadowRoot.querySelector(provider.selectors.container);
        if (shadowContainer && isVisible(shadowContainer)) {
          return {
            container: shadowContainer,
            provider: provider.id,
            selectors: provider.selectors,
            method: 'shadow_selector'
          };
        }
      } catch (e) { continue; }
    }
  }

  return null;
}

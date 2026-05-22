function findButtonByText(container, texts) {
  if (!container) return null;

  var candidates = container.querySelectorAll(
    'button, a, [role="button"], [type="button"], [type="submit"], ' +
    'div[class*="btn" i], div[class*="button" i], span[class*="btn" i], span[class*="button" i], ' +
    'label[class*="btn" i], input[type="button"], input[type="submit"], .btn, .button'
  );

  var lowerTexts = texts.map(function(t) { return t.toLowerCase(); });

  var bestCandidate = null;
  var bestScore = 0;

  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    if (!isVisible(el)) continue;

    var elText = (el.textContent || '').toLowerCase().trim();
    var ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase().trim();
    var title = (el.getAttribute('title') || '').toLowerCase().trim();
    var value = (el.getAttribute('value') || '').toLowerCase().trim();
    var combinedText = [elText, ariaLabel, title, value].join(' ');

    if (combinedText.length < 3) continue;

    for (var j = 0; j < lowerTexts.length; j++) {
      var rejectText = lowerTexts[j];
      var exactScore = combinedText === rejectText ? 100 : 0;
      var containsScore = combinedText.indexOf(rejectText) !== -1 ? 50 : 0;
      var startsWithScore = combinedText.indexOf(rejectText) === 0 ? 75 : 0;
      var score = Math.max(exactScore, containsScore, startsWithScore);

      if (score > bestScore && !_isAcceptButton(combinedText)) {
        bestScore = score;
        bestCandidate = el;
      }
    }
  }

  return bestCandidate;
}

function _isAcceptButton(text) {
  var kw = RulesEngine.getKeywords();
  var acceptIndicators = kw.acceptIndicators || [];
  var negations = kw.negations || [];

  var hasNegation = false;
  for (var n = 0; n < negations.length; n++) {
    if (text.indexOf(negations[n]) !== -1) { hasNegation = true; break; }
  }

  for (var i = 0; i < acceptIndicators.length; i++) {
    if (text.indexOf(acceptIndicators[i]) !== -1 && !hasNegation) {
      return true;
    }
  }

  var rejectSignals = ['reject', 'decline', 'deny', 'ablehnen', 'verweigern',
    'not accept', 'only necessary', 'necessary only', 'nur notwendige', 'nur essenzielle'];
  for (var r = 0; r < rejectSignals.length; r++) {
    if (text.indexOf(rejectSignals[r]) !== -1) return false;
  }

  return false;
}

function clickRejectAll(bannerResult) {
  if (!bannerResult) return null;

  var container = bannerResult.container;
  var kw = RulesEngine.getKeywords();

  if (bannerResult.selectors && bannerResult.selectors.rejectAll) {
    var selectorElement = container.querySelector(bannerResult.selectors.rejectAll);
    if (selectorElement && isVisible(selectorElement)) {
      selectorElement.click();
      return { method: 'selector', text: selectorElement.textContent.trim() };
    }
  }

  var rejectTexts = kw.reject || [];
  var textButton = findButtonByText(container, rejectTexts);
  if (textButton) {
    textButton.click();
    return { method: 'text_match', text: textButton.textContent.trim() };
  }

  return null;
}

async function clickSettingsAndRejectAll(bannerResult) {
  if (!bannerResult) return null;

  var container = bannerResult.container;
  var kw = RulesEngine.getKeywords();
  var settingsTexts = kw.settings || [];
  var saveTexts = kw.save || [];
  var allowedCategories = kw.allowedCategories || [];

  var settingsBtn = null;

  if (bannerResult.selectors && bannerResult.selectors.settings) {
    settingsBtn = container.querySelector(bannerResult.selectors.settings);
  }

  if (!settingsBtn || !isVisible(settingsBtn)) {
    settingsBtn = findButtonByText(container, settingsTexts);
  }

  if (!settingsBtn || !isVisible(settingsBtn)) {
    var allBtns = container.querySelectorAll(
      'button, a, [role="button"], div[role="button"], span[role="button"]'
    );
    for (var i = 0; i < allBtns.length; i++) {
      var btn = allBtns[i];
      if (!isVisible(btn)) continue;
      var classes = (btn.className || '').toLowerCase();
      if (classes.indexOf('setting') !== -1 || classes.indexOf('option') !== -1 || classes.indexOf('config') !== -1 ||
          classes.indexOf('manage') !== -1 || classes.indexOf('custom') !== -1 || classes.indexOf('detail') !== -1) {
        settingsBtn = btn;
        break;
      }
    }
  }

  if (!settingsBtn || !isVisible(settingsBtn)) {
    return null;
  }

  settingsBtn.click();

  await _waitForSettingsPanel(scope, 5000);

  var toggledCount = 0;

  var closestDialog = container.closest('dialog, [role="dialog"], [role="alertdialog"], .modal, .overlay, .popup, .drawer, .panel, [class*="banner" i], [class*="cookie" i], [class*="consent" i]');
  var scope = closestDialog || container;

  var checkboxes = scope.querySelectorAll('input[type="checkbox"]:checked:not([disabled])');

  for (var c = 0; c < checkboxes.length; c++) {
    var cb = checkboxes[c];
    var parent = cb.closest('div, label, li, section');
    var parentText = parent ? parent.textContent.toLowerCase() : '';
    var isAllowed = false;
    for (var a = 0; a < allowedCategories.length; a++) {
      if (parentText.indexOf(allowedCategories[a]) !== -1) { isAllowed = true; break; }
    }

    if (!isAllowed && !cb.disabled) {
      cb.click();
      toggledCount++;
    }
  }

  var toggles = scope.querySelectorAll(
    '[role="switch"][aria-checked="true"], ' +
    '[role="checkbox"][aria-checked="true"], ' +
    '.toggle.on, .toggle.checked, .switch.on, .switch.checked'
  );

  for (var t = 0; t < toggles.length; t++) {
    var toggle = toggles[t];
    if (!isVisible(toggle)) continue;
    var tparent = toggle.closest('div, label, li, section');
    var tparentText = tparent ? tparent.textContent.toLowerCase() : '';
    var tAllowed = false;
    for (var a2 = 0; a2 < allowedCategories.length; a2++) {
      if (tparentText.indexOf(allowedCategories[a2]) !== -1) { tAllowed = true; break; }
    }
    if (!tAllowed) {
      toggle.click();
      toggledCount++;
    }
  }

  var saveBtn = null;

  if (bannerResult.selectors && bannerResult.selectors.saveSettings) {
    var root = container.getRootNode ? container.getRootNode() : document;
    saveBtn = root.querySelector(bannerResult.selectors.saveSettings);
  }

  if (!saveBtn || !isVisible(saveBtn)) {
    saveBtn = findButtonByText(document, saveTexts);
  }

  if (saveBtn && isVisible(saveBtn)) {
    saveBtn.click();
  }

  return { method: 'settings_menu', toggled: toggledCount };
}

function _waitForSettingsPanel(scope, timeoutMs) {
  if (!timeoutMs) timeoutMs = 5000;
  var start = Date.now();
  return new Promise(function(resolve) {
    function check() {
      var toggles = scope.querySelectorAll(
        'input[type="checkbox"], [role="switch"], [role="checkbox"]'
      );
      if (toggles.length > 0) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      setTimeout(check, 150);
    }
    check();
  });
}

function hideBanner(bannerResult) {
  if (!bannerResult || !bannerResult.container) return false;

  var container = bannerResult.container;

  var closeSelectors = [
    '[aria-label*="close" i]',
    '[aria-label*="schließen" i]',
    '.close',
    '.dismiss',
    '[class*="close" i]',
    '[class*="dismiss" i]',
    '.banner-close'
  ];

  for (var i = 0; i < closeSelectors.length; i++) {
    try {
      var closeBtn = container.querySelector(closeSelectors[i]);
      if (closeBtn && isVisible(closeBtn)) {
        closeBtn.click();
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  container.remove();
  return true;
}

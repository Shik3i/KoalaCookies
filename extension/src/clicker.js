const REJECT_TEXTS = [
  'reject all',
  'reject all cookies',
  'reject non-essential',
  'reject non essential',
  'reject optional',
  'reject',
  'decline',
  'decline all',
  'deny',
  'deny all',
  'refuse',
  'refuse all',
  'do not sell',
  'do not sell my info',
  'do not sell my personal',
  'only necessary',
  'necessary only',
  'only essential',
  'essential only',
  'necessary cookies only',
  'use necessary',
  'continue without accepting',
  'continue without agreeing',
  'object all',
  'object to all',
  'no, thanks',
  'no thanks',
  'no, thank you',
  'not accept',
  "don't accept",
  'do not accept',
  'i do not accept',
  'all ablehnen',
  'ablehnen',
  'ablehnen und schließen',
  'nur notwendige',
  'nur essenzielle',
  'nur technisch notwendige',
  'nur erforderliche',
  'auswahl speichern',
  'einstellungen speichern',
  'nicht zustimmen',
  'verweigern',
  'alle verweigern',
  'abgelehnt',
  'schließen',
  'schliessen'
];

function findButtonByText(container, texts) {
  if (!container) return null;

  const candidates = container.querySelectorAll(
    'button, a, [role="button"], [type="button"], [type="submit"], ' +
    'div[class*="btn" i], div[class*="button" i], span[class*="btn" i], span[class*="button" i], ' +
    'label[class*="btn" i], input[type="button"], input[type="submit"], .btn, .button'
  );

  const lowerTexts = texts.map(t => t.toLowerCase());

  let bestCandidate = null;
  let bestScore = -1;

  for (const el of candidates) {
    if (!isVisible(el)) continue;

    const elText = (el.textContent || '').toLowerCase().trim();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase().trim();
    const title = (el.getAttribute('title') || '').toLowerCase().trim();
    const value = (el.getAttribute('value') || '').toLowerCase().trim();
    const combinedText = [elText, ariaLabel, title, value].join(' ');

    if (combinedText.length < 3) continue;

    for (const rejectText of lowerTexts) {
      const exactScore = combinedText === rejectText ? 100 : 0;
      const containsScore = combinedText.includes(rejectText) ? 50 : 0;
      const startsWithScore = combinedText.startsWith(rejectText) ? 75 : 0;
      const score = Math.max(exactScore, containsScore, startsWithScore);

      if (score > bestScore && !isAcceptButton(combinedText, rejectText)) {
        bestScore = score;
        bestCandidate = el;
      }
    }
  }

  return bestCandidate;
}

function isAcceptButton(text, matchedText) {
  const acceptIndicators = [
    'accept all', 'accept all cookies', 'agree', 'allow all',
    'zustimmen', 'alle akzeptieren', 'einverstanden',
    'got it', 'i agree'
  ];

  const negations = ['do not', "don't", "doesn't", "won't", 'cannot accept'];
  const hasNegation = negations.some(n => text.includes(n));
  if (acceptIndicators.some(indicator => text.includes(indicator) && !hasNegation)) {
    return true;
  }

  if (text.includes('reject') || text.includes('decline') || text.includes('deny') ||
      text.includes('ablehnen') || text.includes('verweigern') || text.includes('not accept') ||
      text.includes('only necessary') || text.includes('necessary only') ||
      text.includes('nur notwendige') || text.includes('nur essenzielle')) {
    return false;
  }

  return false;
}

function clickRejectAll(bannerResult) {
  if (!bannerResult) return null;

  const container = bannerResult.container;

  if (bannerResult.selectors && bannerResult.selectors.rejectAll) {
    const selectorElement = container.querySelector(bannerResult.selectors.rejectAll);
    if (selectorElement && isVisible(selectorElement)) {
      selectorElement.click();
      return { method: 'selector', text: selectorElement.textContent.trim() };
    }
  }

  const textButton = findButtonByText(container, REJECT_TEXTS);
  if (textButton) {
    textButton.click();
    return { method: 'text_match', text: textButton.textContent.trim() };
  }

  return null;
}

async function clickSettingsAndRejectAll(bannerResult) {
  if (!bannerResult) return null;

  const container = bannerResult.container;

  const settingsTexts = [
    'settings', 'options', 'more', 'customize', 'configure',
    'einstellungen', 'optionen', 'mehr', 'konfigurieren',
    'manage', 'manage cookies', 'manage options',
    'verwalten', 'anpassen', 'cookie settings',
    'learn more', 'cookie preferences', 'privacy settings',
    'detailed settings', 'cookie options'
  ];

  let settingsBtn = null;

  if (bannerResult.selectors && bannerResult.selectors.settings) {
    settingsBtn = container.querySelector(bannerResult.selectors.settings);
  }

  if (!settingsBtn || !isVisible(settingsBtn)) {
    settingsBtn = findButtonByText(container, settingsTexts);
  }

  if (!settingsBtn || !isVisible(settingsBtn)) {
    const allBtns = container.querySelectorAll(
      'button, a, [role="button"], div[role="button"], span[role="button"]'
    );
    for (const btn of allBtns) {
      if (!isVisible(btn)) continue;
      const classes = (btn.className || '').toLowerCase();
      if (classes.includes('setting') || classes.includes('option') || classes.includes('config') ||
          classes.includes('manage') || classes.includes('custom') || classes.includes('detail')) {
        settingsBtn = btn;
        break;
      }
    }
  }

  if (!settingsBtn || !isVisible(settingsBtn)) {
    return null;
  }

  settingsBtn.click();

  await new Promise(resolve => setTimeout(resolve, 600));

  const allowedCategories = ['necessary', 'essential', 'functional', 'notwendig', 'essentiell', 'funktional'];
  let toggledCount = 0;

  const scope = container.closest('dialog, [role="dialog"], [role="alertdialog"], .modal, .overlay, .popup, .drawer, .panel, [class*="banner" i], [class*="cookie" i], [class*="consent" i]') || document;

  const checkboxes = scope.querySelectorAll(
    'input[type="checkbox"]:checked:not([disabled])'
  );

  for (const cb of checkboxes) {
    const parent = cb.closest('div, label, li, section');
    const parentText = parent ? parent.textContent.toLowerCase() : '';
    const isAllowed = allowedCategories.some(cat => parentText.includes(cat));

    if (!isAllowed && !cb.disabled) {
      cb.click();
      toggledCount++;
    }
  }

  const toggles = scope.querySelectorAll(
    '[role="switch"][aria-checked="true"], ' +
    '[role="checkbox"][aria-checked="true"], ' +
    '.toggle.on, .toggle.checked, .switch.on, .switch.checked'
  );

  for (const toggle of toggles) {
    if (!isVisible(toggle)) continue;
    const parent = toggle.closest('div, label, li, section');
    const parentText = parent ? parent.textContent.toLowerCase() : '';
    const isAllowed = allowedCategories.some(cat => parentText.includes(cat));
    if (!isAllowed) {
      toggle.click();
      toggledCount++;
    }
  }

  let saveBtn = null;

  if (bannerResult.selectors && bannerResult.selectors.saveSettings) {
    saveBtn = document.querySelector(bannerResult.selectors.saveSettings);
  }

  if (!saveBtn || !isVisible(saveBtn)) {
    const saveTexts = ['save', 'confirm', 'save & close', 'save and close', 'save and exit',
                       'speichern', 'bestätigen', 'übernehmen', 'auswahl speichern',
                       'confirm choices', 'confirm my choices', 'bestätigen und schließen'];
    saveBtn = findButtonByText(document, saveTexts);
  }

  if (saveBtn && isVisible(saveBtn)) {
    saveBtn.click();
  }

  return { method: 'settings_menu', toggled: toggledCount };
}

function hideBanner(bannerResult) {
  if (!bannerResult || !bannerResult.container) return false;

  const container = bannerResult.container;

  const closeSelectors = [
    '[aria-label*="close" i]',
    '[aria-label*="schließen" i]',
    '.close',
    '.dismiss',
    '[class*="close" i]',
    '[class*="dismiss" i]',
    'button:last-child',
    '.banner-close'
  ];

  for (const sel of closeSelectors) {
    try {
      const closeBtn = container.querySelector(sel);
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clickRejectAll, clickSettingsAndRejectAll, hideBanner, findButtonByText, REJECT_TEXTS };
}

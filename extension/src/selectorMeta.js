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

const BANNER_META = {
  onetrust:       { name: 'OneTrust',              url: 'https://www.onetrust.com' },
  cookiebot:      { name: 'Cookiebot',             url: 'https://www.cookiebot.com' },
  usercentrics:   { name: 'Usercentrics',          url: 'https://usercentrics.com' },
  quantcast:      { name: 'Quantcast Choice',      url: 'https://www.quantcast.com' },
  sourcepoint:    { name: 'Sourcepoint',           url: 'https://sourcepoint.com' },
  cookieconsent:  { name: 'CookieConsent (Osano)', url: 'https://www.osano.com/cookieconsent' },
  fundingchoices: { name: 'Google Funding Choices', url: 'https://fundingchoices.google.com' },
  didomi:         { name: 'Didomi',                url: 'https://www.didomi.io' },
  klaro:          { name: 'Klaro!',                url: 'https://klaro.org' },
  tarteaucitron:  { name: 'TarteAuCitron',         url: 'https://tarteaucitron.io' },
  ccm19:          { name: 'CCM19',                 url: 'https://www.ccm19.de' },
  coinhive:       { name: 'Generic (Coinhive)',    url: null }
};

var RulesEngine = (function() {
  var _providers = null;
  var _keywords = null;
  var _detectionKeywords = null;
  var _ready = null;
  var _fallback = {
    providers: [],
    globalKeywords: { reject: [], settings: [], save: [], allowedCategories: [], acceptIndicators: [], negations: [] },
    detectionKeywords: { banner: [] }
  };

  function _load() {
    try {
      var url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL('rules.json')
        : 'rules.json';
      return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          _providers = data.providers || [];
          _keywords = data.globalKeywords || _fallback.globalKeywords;
          _detectionKeywords = (data.detectionKeywords && data.detectionKeywords.banner) || [];
          return true;
        })
        .catch(function(e) {
          console.error('KoalaCookies: Failed to load rules.json, using embedded fallback', e);
          _useFallback();
          return false;
        });
    } catch (e) {
      console.error('KoalaCookies: Failed to load rules.json', e);
      _useFallback();
      _ready = Promise.resolve(false);
      return _ready;
    }
  }

  function _useFallback() {
    _providers = _fallback.providers;
    _keywords = _fallback.globalKeywords;
    _detectionKeywords = _fallback.detectionKeywords.banner;
  }

  function ready() {
    if (!_ready) _ready = _load();
    return _ready;
  }

  function getProviders() {
    return _providers || [];
  }

  function getKeywords() {
    return _keywords || { reject: [], settings: [], save: [], allowedCategories: [], acceptIndicators: [], negations: [] };
  }

  function getDetectionKeywords() {
    return _detectionKeywords || [];
  }

  function getProviderMeta(providerId) {
    var providers = getProviders();
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].id === providerId) {
        return { name: providers[i].name, url: providers[i].url || null };
      }
    }
    return null;
  }

  function getAllProviderMeta() {
    return getProviders().map(function(p) {
      return { id: p.id, name: p.name, url: p.url || null };
    });
  }

  ready();

  return {
    ready: ready,
    getProviders: getProviders,
    getKeywords: getKeywords,
    getDetectionKeywords: getDetectionKeywords,
    getProviderMeta: getProviderMeta,
    getAllProviderMeta: getAllProviderMeta
  };
})();

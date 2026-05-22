(function() {
  if (window.__koalaPickerActive) return;
  window.__koalaPickerActive = true;

  var hovered = null;
  var HIGHLIGHT_CLASS = '__koala-picker-highlight';

  var style = document.createElement('style');
  style.textContent = '.' + HIGHLIGHT_CLASS + ' { outline: 2px solid #f43f5e !important; outline-offset: 2px !important; background: rgba(244, 63, 94, 0.08) !important; }' +
    '.__koala-picker-label { position: fixed; z-index: 2147483647; background: #1e1e2e; color: #e2e8f0; font: 11px monospace; padding: 4px 8px; border-radius: 4px; border: 1px solid #f43f5e; pointer-events: none; white-space: nowrap; max-width: 400px; overflow: hidden; text-overflow: ellipsis; }';
  document.head.appendChild(style);

  var label = document.createElement('div');
  label.className = '__koala-picker-label';
  label.style.display = 'none';
  document.body.appendChild(label);

  function getElementProfile(el) {
    var profile = {
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      className: (typeof el.className === 'string') ? el.className : null,
      textContent: (el.textContent || '').trim().substring(0, 80),
      attributes: {}
    };

    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name === 'class' || attr.name === 'id' || attr.name === 'style') continue;
      profile.attributes[attr.name] = attr.value.substring(0, 120);
    }

    profile.parents = [];
    var parent = el.parentElement;
    for (var j = 0; j < 3 && parent && parent !== document.body && parent !== document.documentElement; j++) {
      profile.parents.push({
        tagName: parent.tagName.toLowerCase(),
        id: parent.id || null,
        className: (typeof parent.className === 'string') ? parent.className.split(' ').slice(0, 5).join(' ') : null
      });
      parent = parent.parentElement;
    }

    return profile;
  }

  function onMouseMove(e) {
    if (hovered === e.target) return;
    if (hovered) hovered.classList.remove(HIGHLIGHT_CLASS);
    hovered = e.target;
    hovered.classList.add(HIGHLIGHT_CLASS);

    var rect = hovered.getBoundingClientRect();
    label.style.display = 'block';
    label.style.left = Math.min(rect.left, window.innerWidth - 410) + 'px';
    label.style.top = (rect.top - 28 > 0 ? rect.top - 28 : rect.bottom + 4) + 'px';
    label.textContent = hovered.tagName.toLowerCase() + (hovered.id ? '#' + hovered.id : '') + ' | class="' + ((hovered.className || '').substring(0, 60)) + '"';
  }

  function onClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    var profile = getElementProfile(hovered);
    cleanup();
    chrome.runtime.sendMessage({ type: 'pickerElementCaptured', profile: profile }).catch(function() {});
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
      chrome.runtime.sendMessage({ type: 'pickerCancelled' }).catch(function() {});
    }
  }

  function cleanup() {
    window.__koalaPickerActive = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (hovered) hovered.classList.remove(HIGHLIGHT_CLASS);
    if (label && label.parentNode) label.remove();
    if (style && style.parentNode) style.remove();
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
})();

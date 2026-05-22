# KoalaCookies - Architecture

## Übersicht

KoalaCookies ist eine Browser-Erweiterung nach dem Manifest V3 Standard. Sie besteht aus einem Background Service Worker, einem Content Script und einer Popup-UI.

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Popup UI   │    │  Background  │    │ Content Script│  │
│  │              │    │    Service   │    │               │  │
│  │  popup.html  │◄──►│   Worker     │◄──►│ content.js    │  │
│  │  popup.js    │    │              │    │ storage.js    │  │
│  │  popup.css   │    │ background.js│    │ selectorMeta.js│ │
│  └──────────────┘    │ storage.js   │    │ selectors.js  │  │
│                      │ selectorMeta.js│   │ clicker.js    │  │
│                      └──────┬───────┘    │ picker.js     │  │
│                      │  Storage API  │◄────────────┘         │
│                      │               │                       │
│                      │  chrome.storage│                      │
│                      │    .local     │                       │
│                      └───────────────┘                       │
└─────────────────────────────────────────────────────────────┘
          │                                          │
          ▼                                          ▼
  ┌──────────────┐                         ┌────────────────┐
  │   Webseite   │                         │    Webseite    │
  │              │                         │                │
  │ Cookie-Banner│◄──── Injection ──────── │  DOM-Zugriff   │
  │  wird auto.  │                         │  Klick-         │
  │  abgelehnt   │                         │  Simulation     │
  └──────────────┘                         └────────────────┘
```

## Komponenten im Detail

### 1. Content Script (`extension/src/content.js`)

**Aufgabe:** Wird in jede besuchte Webseite injiziert. Hat Zugriff auf das DOM.

**Lebenszyklus:**
1. Wird beim Laden einer Seite injiziert (`document_idle`)
2. `selectorMeta.js` stellt die Selektordatenbank (`BANNER_SELECTORS`) und Anbieter-Metadaten (`BANNER_META`) bereit
3. `selectors.js` stellt `detectBanner()` bereit (jetzt async), das nach Cookie-Bannern scannt — prüft zuerst Custom-Selectoren, dann Built-in-Provider, dann Keywords, dann Shadow DOM
4. Bei Treffer: `clicker.js` sucht nach "Reject All" Buttons (scoped auf Banner-Container)
5. Ergebnis wird per `chrome.runtime.sendMessage()` an Background gesendet
6. `storage.js` aktualisiert und persistiert die Statistik via `chrome.storage.local`

**Erkennungsstrategien (`selectors.js`):**
- **Custom-Selectoren:** Vom Nutzer per Element-Picker erfasste DOM-Elemente werden vor allen Built-in-Providern geprüft
- **Heuristik:** Prüft `z-index`, `position: fixed`, Viewport-Position (Bottom/Top)
- **Selektor-Matching:** CSS-Selektor-Datenbank für 12+ bekannte Anbieter (aus `selectorMeta.js`)
- **Keyword-Matching:** Fallback für unbekannte Banner anhand von Cookie/Consent/Datenschutz-Keywords
- **Shadow-DOM:** Rekursive Durchsuchung von Shadow-Roots
- **SPA-Navigation:** URL-Änderungen werden via `popstate`-Event und `MutationObserver`-URL-Vergleich erkannt — Banner werden nach Client-Side-Navigation erneut geprüft

**Klick-Strategien (`clicker.js`):**
1. Text-Matching (case-insensitive, deutsch + englisch):
   - `"reject all"`, `"alle ablehnen"`
   - `"only necessary"`, `"nur notwendige"`
   - `"decline"`, `"ablehnen"`
   - `"deny"`, `"verweigern"`
2. ARIA-Label / Title-Attribut Matching
3. CSS-Selektor-Fallback für bekannte Anbieter
4. `button`-Element-Filter mit priorisierten Text-Ranks
5. Option-Schalter: "Mehr Optionen" → Alle Checkboxen/Toggles deaktivieren → Speichern

**Fallback-Verhalten (konfigurierbar):**
- `mode: "gentle"` (Standard): Kein sichtbarer Button gefunden → nichts tun, Banner bleibt
- `mode: "aggressive"` (optional): Kein Button gefunden → Banner per CSS ausblenden

### 2. Background Service Worker (`extension/src/background.js`)

**Aufgabe:** Koordiniert Nachrichten, persistiert Statistiken, verwaltet Einstellungen.

**Events:**
- `chrome.runtime.onMessage` - Empfängt Statistik-Updates, Log-Anfragen, Dev-Info, Picker-Steuerung, Custom-Selector-Verwaltung und Selector-Liste vom Content Script und Popup
- `chrome.runtime.onInstalled` - Initialisiert Default-Einstellungen
- `importScripts('selectorMeta.js', 'storage.js')` - Lädt die Selektordatenbank und das Storage-Modul in den Service Worker

**Funktionen:**
- Statistik-Updates entgegennehmen und aggregieren (mit Promise-Lock gegen Race-Conditions)
- Action-Log schreiben (max. 10 Einträge, neueste zuerst)
- Dev-Info per Domain speichern (Provider, Erkennungsmethode, Container)
- Stats, Log und Dev-Info an Popup ausliefern (auf Anfrage)
- Modus-Wechsel (gentle/aggressive) persistieren
- Domain-Whitelist verwalten
- **Element Picker:** `startPicker` injiziert `picker.js` via `chrome.scripting.executeScript`
- **Custom-Selectoren:** Speichern, Abrufen und Löschen von User-erfassten DOM-Element-Profilen in `chrome.storage.local`
- **Selector-Liste:** Liefert alle bekannten Provider mit Selektoren und Metadaten an das Popup

### 3. Popup UI (`extension/popup/`)

**Aufgabe:** Zeigt Statistiken und Einstellungen an.

**Ansichten:**
- **Stats-Tab:** Aktuelle Domain und Banner-Status, Gesamtstatistik, Modus-Umschaltung, Whitelist-Button (+ Double-Click öffnet Whitelist-Liste mit Remove-Option)
- **Log-Tab:** Letzte 10 Aktionen mit Zeitstempel, Domain, Aktion, Methode und Detail + "Copy as Text"-Button für formatierten Clipboard-Export
- **Dev-Tab:** 
  - Debug-Infos (Provider, Erkennungsmethode, Container-Element, Strategie)
  - Element Picker (Hover-Highlighter + DOM-Element-Erfassung)
  - Custom-Selector-Liste (erfasste Elemente mit Remove-Option)
  - Known Providers (scrollbare, kollabierbare Liste aller 12 Anbieter mit CSS-Selektoren)
- Dark Mode (systemabhängig)
- Vollständige i18n (en/de) für alle UI-Elemente inkl. Dev-Tab

### 4. Storage (`extension/src/storage.js`)

**Kombiniertes Modul:** Enthält sowohl die Storage-Abstraktion als auch die Statistik-Logik. Wird von Content Scripts, Background Service Worker und Popup gemeinsam genutzt.

**Datenmodell:**
```json
{
  "mode": "gentle",
  "whitelist": [],
  "stats": {
    "totalDetected": 0,
    "totalRejected": 0,
    "totalSkipped": 0,
    "totalHidden": 0,
    "byDomain": {
      "example.com": {
        "detected": 5,
        "rejected": 4,
        "skipped": 1,
        "hidden": 0,
        "lastSeen": "2024-01-01T00:00:00Z"
      }
    }
  },
  "customSelectors": [
    {
      "profile": {
        "tagName": "div",
        "id": "cookie-banner",
        "className": "banner cookie-consent",
        "textContent": "This site uses cookies...",
        "attributes": { "data-cmp": "onetrust" },
        "parents": [
          { "tagName": "body", "id": null, "className": null }
        ]
      },
      "domain": "example.com",
      "addedAt": "2026-01-15T14:32:05.000Z"
    }
  ],
  "actionLog": [
    {
      "timestamp": "2024-01-15T14:32:05.000Z",
      "domain": "example.com",
      "action": "rejected",
      "method": "text_match",
      "detail": "Alle ablehnen"
    }
  ],
  "bannerInfo": {
    "example.com": {
      "provider": "onetrust",
      "detectionMethod": "selector",
      "containerInfo": "div#onetrust-banner-sdk",
      "action": "rejected",
      "resultDetail": { "method": "text_match", "text": "Alle ablehnen" },
      "timestamp": "2024-01-15T14:32:05.000Z"
    }
  }
}
```

### 5. Selektordatenbank (`extension/src/selectorMeta.js`)

Separierte Datei mit bekannten Cookie-Banner-Selektoren und Anbieter-Metadaten, von Content Script und Background Service Worker gemeinsam genutzt:

```js
const BANNER_SELECTORS = {
  onetrust: {
    container: '#onetrust-banner-sdk',
    rejectAll: '#onetrust-reject-all-handler, .ot-sdk-row button[aria-label*="reject"]',
    settings: '#onetrust-pc-btn-handler',
    saveSettings: '.save-preference-btn-handler'
  },
  cookiebot: {
    container: '#CybotCookiebotDialog',
    rejectAll: '#CybotCookiebotDialogBodyButtonDecline',
    settings: '#CybotCookiebotDialogBodyLevelButtonCustomize'
  }
  // ... 10 weitere Anbieter
};

const BANNER_META = {
  onetrust:  { name: 'OneTrust',    url: 'https://www.onetrust.com' },
  cookiebot: { name: 'Cookiebot',   url: 'https://www.cookiebot.com' }
  // ...
};
```

### 6. Element Picker (`extension/src/picker.js`)

Injiziertes Content Script für den Element-Picker. Hover-Highlighter mit roter Outline, Klick erfasst DOM-Element-Profil (tagName, ID, Klassen, Attribute, Eltern-Hierarchie) und sendet es an den Background Service Worker zur Speicherung als Custom-Selector.

## Berechtigungen

```json
{
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

`<all_urls>` ist notwendig, weil Cookie-Banner auf jeder Domain existieren können. Die Extension sendet niemals Daten nach extern.

## Build & Deployment

```
scripts/
├── build.sh           # Baut Firefox + Chrome ZIPs
├── generate-icons.sh  # Generiert Icons via Python
└── generate_icons.py  # Python-Script: PNG-Icons aus Code
```

**build.sh** erzeugt:
1. `${RELEASE_DIR}/koala_cookies_firefox_vX.Y.Z.zip` - mit `manifest.json` und `browser_specific_settings`
2. `${RELEASE_DIR}/koala_cookies_chrome_vX.Y.Z.zip` - mit `manifest.json` ohne Firefox-spezifische Keys

**CI/CD (.github/workflows/release.yml):**
- Trigger bei Tag-Push: `v*.*.*`
- Führt `build.sh` aus
- Erstellt GitHub Release mit beiden ZIPs als Assets

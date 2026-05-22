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
│  │  popup.js    │    │              │    │ detector.js   │  │
│  │  popup.css   │    │ background.js│    │ clicker.js    │  │
│  └──────────────┘    └──────┬───────┘    └───────┬───────┘  │
│                              │                     │         │
│                      ┌───────┴───────┐             │         │
│                      │  Storage API  │◄────────────┘         │
│                      │               │                       │
│                      │  chrome.storage│                      │
│                      │    .local     │                       │
│                      └───────────────┘                       │
│                                                              │
│                      ┌───────────────┐                       │
│                      │  stats.js     │                       │
│                      │  storage.js   │                       │
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
2. `detector.js` scannt das DOM nach Cookie-Bannern
3. Bei Treffer: `clicker.js` sucht nach "Reject All" Buttons
4. Ergebnis wird per `chrome.runtime.sendMessage()` an Background gesendet
5. `stats.js` aktualisiert und persistiert die Statistik

**Erkennungsstrategien (`detector.js`):**
- **Keyword-Scan:** Durchsucht sichtbare Textknoten nach typischen Cookie-Banner-Phrasen (`"cookie"`, `"consent"`, `"datenschutz"`, `"zustimmen"`, etc.)
- **Selektor-Matching:** Prüft gegen eine Datenbank bekannter CSS-Selektoren:
  ```js
  const KNOWN_SELECTORS = [
    '#onetrust-banner-sdk',
    '#CybotCookiebotDialog',
    '.cookie-consent',
    '#cookie-law-info-bar',
    '.cc-banner',
    '#usercentrics-root',
    '.cookie-banner',
    '[data-testid="cookie-banner"]',
    '#qc-cmp2-container',
    '.iubenda-cs-banner',
    // ... erweiterbar
  ];
  ```
- **Heuristik:** Prüft `z-index`, `position: fixed`, Viewport-Position (Bottom/Top)
- **MutationObserver:** Überwacht DOM-Änderungen für verzögert geladene Banner
- **Shadow-DOM:** Rekursive Durchsuchung von Shadow-Roots

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
- `chrome.runtime.onMessage` - Empfängt Statistik-Updates vom Content Script
- `chrome.tabs.onUpdated` - Verfolgt Seitenwechsel für korrekte Statistik-Zuordnung
- `chrome.runtime.onInstalled` - Initialisiert Default-Einstellungen
- `chrome.action.onClicked` - (optional) Direkter Klick auf das Icon

**Funktionen:**
- Statistik-Updates entgegennehmen und aggregieren
- Stats an Popup ausliefern (auf Anfrage)
- Modus-Wechsel (gentle/aggressive) persistieren
- Domain-Whitelist verwalten

### 3. Popup UI (`extension/popup/`)

**Aufgabe:** Zeigt Statistiken und Einstellungen an.

**Ansichten:**
- Aktuelle Domain und Banner-Status
- Button zum Umschalten gentle/aggressive
- Gesamtstatistik (Total erkannt, rejected, skipped)
- Link zu Einstellungen / Whitelist
- Dark Mode (systemabhängig)

### 4. Storage (`extension/src/storage.js`)

**Datenmodell:**
```json
{
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
  "settings": {
    "mode": "gentle",
    "whitelist": []
  }
}
```

### 5. Selektordatenbank (`extension/src/selectors.js`)

Separierte Datei mit bekannten Cookie-Banner-Selektoren, nach Anbieter kategorisiert:

```js
export const BANNER_SELECTORS = {
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
  },
  // ... weitere Anbieter
};
```

## Berechtigungen

```json
{
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "optional_permissions": []
}
```

`<all_urls>` ist notwendig, weil Cookie-Banner auf jeder Domain existieren können. Die Extension sendet niemals Daten nach extern.

## Build & Deployment

```
scripts/
├── build.sh           # Baut Firefox + Chrome ZIPs
├── bump-version.sh    # Hilft beim Versions-Bump vor Release
└── lint.sh            # ESLint + Prettier Check
```

**build.sh** erzeugt:
1. `${RELEASE_DIR}/koala_cookies_firefox_vX.Y.Z.zip` - mit `manifest.json` und `browser_specific_settings`
2. `${RELEASE_DIR}/koala_cookies_chrome_vX.Y.Z.zip` - mit `manifest.json` ohne Firefox-spezifische Keys

**CI/CD (.github/workflows/release.yml):**
- Trigger bei Tag-Push: `v*.*.*`
- Führt `build.sh` aus
- Erstellt GitHub Release mit beiden ZIPs als Assets

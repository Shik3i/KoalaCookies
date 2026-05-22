# KoalaCookies - AI Init / Implementation Plan

## Vision

KoalaCookies ist eine datenschutzfreundliche, quelloffene Browser-Erweiterung für Firefox und Chromium-basierte Browser. Sie erkennt Cookie-Banner auf Webseiten automatisch und klickt den "Alle ablehnen"-Button (Reject All). Falls kein solcher Button existiert, kann die Extension das Banner optional ausblenden oder es sichtbar lassen, damit der Nutzer über das erweiterte Menü manuell entscheiden kann.

## Kernfunktionen

### 1. Cookie-Banner-Erkennung
- DOM-basierte Erkennung von Cookie-Consent-Bannern
- Keyword-Matching für Banner-Texte in Deutsch und Englisch
- CSS-Selektor-Datenbank für bekannte Banner-Anbieter (OneTrust, Cookiebot, Usercentrics, etc.)
- Erkennung von Iframe-basierten und Shadow-DOM-Bannern

### 2. Automatische Cookie-Ablehnung
- Strategie 1: "Reject All"-Button per Text/Selektor finden und klicken
- Strategie 2: "Nur notwendige Cookies"-Button finden und klicken
- Strategie 3: "Mehr Optionen" / "Einstellungen" öffnen und darin alle Toggles deaktivieren
- Strategie 4: "Ablehnen" / "Ablehnen und schließen" finden

### 3. Konfigurierbares Fallback-Verhalten
- **"Sanft"-Modus (Standard):** Wenn kein Ablehnungs-Button gefunden wird, bleibt das Banner sichtbar. Der Nutzer soll manuell über das "Mehr Optionen"-Menü entscheiden.
- **"Aggressiv"-Modus (optional):** Wenn keine Ablehnung möglich ist, wird das Banner per CSS ausgeblendet (`display: none`).

### 4. Interne Statistik & Logging
- Anzahl erkannter Cookie-Banner
- Anzahl erfolgreich abgelehnter Banner
- Anzahl nicht bearbeitbarer Banner (gefunden, aber kein Button)
- Anzahl ausgeblendeter Banner (nur im aggressiven Modus)
- Statistik per Domain und global
- **Action-Log:** Letzte 10 Aktionen mit Zeitstempel, Domain, Methode, Button-Text
- **Dev-Info:** Technische Debug-Infos pro Domain (Provider, Erkennungsmethode, Container)
- Lokale Speicherung via `chrome.storage.local` (keine externe Datenübermittlung)

### 5. Popup-UI
- Tab-Navigation (Stats | Log | Dev)
- Stats-Tab: Statistik-Anzeige (erkannt, rejected, skipped, hidden)
- Log-Tab: Letzte 10 Aktionen mit Zeitstempel, Domain, Methode, Button-Text
- Dev-Tab: Technische Debug-Infos (Provider, Erkennungsmethode, Container, Strategie)
- Toggle für "Sanft" vs. "Aggressiv" Modus
- Domain-Whitelist zum Deaktivieren auf bestimmten Seiten
- Dark Mode Support

## Technische Architektur

### Komponenten
```
extension/
├── manifest.json          # Extension Manifest (MV3)
├── rules/                # Regel-Datenbank
│   ├── rules.json            # Provider + Keywords
│   └── README.md             # Dokumentation für Contributor
├── src/
│   ├── background.js      # Service Worker
│   ├── content.js         # Content Script (Orchestration)
│   ├── storage.js         # Storage-Abstraktion + Statistiken
│   ├── rules.js           # Regel-Lader + Engine (NEU)
│   ├── selectorMeta.js    # Selektordatenbank + Anbieter-Metadaten
│   ├── selectors.js       # Banner-Erkennung (Custom + Built-in + Keywords + Shadow DOM)
│   ├── clicker.js         # Button-Findung + Klicklogik
│   └── picker.js          # Element-Picker (Hover-Highlighter + DOM-Erfassung)
├── popup/
│   ├── popup.html         # Popup-UI
│   ├── popup.js           # Popup-Logik
│   └── popup.css          # Popup-Styling
├── styles/
│   └── global.css         # Globale Styles
├── _locales/
│   ├── en/
│   │   └── messages.json  # Englische Übersetzungen
│   └── de/
│       └── messages.json  # Deutsche Übersetzungen
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Datenfluss
1. **Page Load** → Content Script injiziert → `selectors.js` scannt DOM auf Cookie-Banner
2. **Banner erkannt** → `clicker.js` sucht nach passendem Button → führt Klick aus
3. **Ergebnis** → `storage.js` aktualisiert Zähler, Action-Log und Dev-Info → persistiert via `chrome.storage.local`
4. **Popup öffnen** → Liest Stats, Log und Dev-Info aus Storage → Zeigt aktuelle Infos an

### Berechtigungen (minimales Prinzip)
- `<all_urls>` oder `activeTab` + Host-Permissions für DOM-Zugriff
- `storage` für Statistiken, Einstellungen und Custom-Selectoren
- `scripting` für Element-Picker (Injektion von `picker.js`)
- Keine `cookies`, `webRequest` oder andere invasive Permission

## Roadmap

### v0.1.0 - MVP / Prototyp
- [x] Projektstruktur und Build-Pipeline
- [x] Banner-Erkennung (Keyword-basiert + grundlegende Selektoren)
- [x] Reject-All-Klick (einfaches Text-Matching)
- [x] Basis-Statistik (Anzahl rejected)
- [x] Popup mit Statistik-Anzeige
- [x] Sanft-Modus (kein Ausblenden, wenn kein Button)

### v0.2.0 - Verbesserte Erkennung
- [x] Erweiterte Selektordatenbank (OneTrust, Cookiebot, etc.)
- [x] Shadow-DOM Unterstützung
- [x] Iframe-basierte Banner
- [x] "Mehr Optionen" → Alle Toggles deaktivieren

### v0.3.0 - Erweiterte Features
- [x] Aggressiv-Modus (Banner ausblenden)
- [x] Domain-Whitelist
- [x] i18n (Deutsch + Englisch)
- [x] Dark Mode

### v1.0.0 - Release
- [x] Vollständige Testabdeckung (manuell, siehe Audit)
- [x] Performance-Optimierung (MutationObserver statt Polling)
- [ ] Store-Listing vorbereiten (Firefox Add-ons + Chrome Web Store)
- [x] Firefox + Chrome ZIP-Builds via CI/CD
- [x] Action-Log (letzte 10 Aktionen im Popup)
- [x] Dev-Tab (technische Debug-Infos zur aktuellen Seite)

### v1.0.1 - Erweiterte Dev-Tools & Custom-Selectoren
- [x] Provider-Selector-Liste im Dev-Tab (scrollbar, kollabierbar, 12 Anbieter mit Metadaten)
- [x] Copy Action Log als formatierter Plaintext
- [x] Element-Picker (Hover-Highlighter + DOM-Element-Erfassung per Klick)
- [x] Custom-Selector-Speicherung in `chrome.storage.local`
- [x] Custom-Selectoren in der Detection-Pipeline (werden vor Built-in-Providern geprüft)
- [x] Whitelist-Management-UI (Double-Click öffnet Domain-Liste mit Remove)

### v1.0.2 - Audit-Bugfixes (Teil 1)
- [x] selector-list async/sync mismatch (Dev-Tab broken)
- [x] Whitelist-Button i18n Text-Duplizierung ("Remove from to Whitelist")
- [x] clickSettingsAndRejectAll auf Banner-Container scopen (nicht globales document)
- [x] isAcceptButton: Kontraktionen wie don't/doesn't/won't erkennen
- [x] extractLogInfo: toggled-Count im Log-Detail anzeigen
- [x] i18n für alle hartcodierten Strings (14 neue Keys, en+de)
- [x] Picker-Crash bei Keyboard-Navigation (null hovered)
- [x] Tab-Labels (Stats, Log, Dev) per i18n
- [x] Version aus chrome.runtime.getManifest() lesen (__VERSION__ Fallback für Dev)
- [x] Doppelte CSS-Blöcke entfernt
- [x] color-scheme: light dark in global.css

### v1.0.3 - Audit-Bugfixes (Teil 2)
- [x] Stats-Race-Condition mit Promise-Lock serialisiert
- [x] SPA-Navigation: MutationObserver + popstate erkennen URL-Änderungen
- [x] getCustomSelectors nutzt Storage-Abstraktion (konsistent)
- [x] MutationObserver Fallback bei document.body === null
- [x] module.exports Dead-Code aus allen Source-Files entfernt
- [x] Firefox Extension ID konfigurierbar via FIREFOX_EXTENSION_ID env var
- [x] startPicker prüft auf restricted schemes (chrome://, edge://, etc.)
- [x] Unsicheres button:last-child aus hideBanner-Selector entfernt

### v1.1.0 - Wartbare Regel-Datenbank (umgesetzt)
- [x] **`rules/rules.json`** als zentrale, von Menschen lesbare Regeldatei im Repo (`extension/rules/rules.json`)
- [x] Migriere bestehende BANNER_SELECTORS aus `selectorMeta.js` in `rules/rules.json`
- [x] Definiere ein klares JSON-Schema für Contributor: `{provider, container, rejectAll, settings, saveSettings, acceptAll, close, urlPattern}`
- [x] **`src/rulesEngine.js`**: Neues Modul, das `rules/rules.json` lädt und die Daten für `selectors.js` bereitstellt
- [x] `selectors.js` nutzt die neue Regel-Quelle (statt hartem `selectorMeta.js`)
- [ ] Contributor-Doku in `CONTRIBUTING.md`: Wie man neue Provider in `rules/rules.json` einträgt
- [ ] Build-Skript validiert `rules/rules.json` gegen das Schema (JSON Schema validation)

**Wichtig: Keine Remote-Requests.** Die Extension liest `rules/rules.json` aus dem eigenen Bundle (Content Script Injection). Neue Regeln erreichen Nutzer ausschließlich über Firefox-/Chrome-Web-Store-Updates. Das Repository ist die Single Source of Truth.

### v1.2.0 - Iframe-Support (umgesetzt)
- [x] Content Script läuft in allen Frames (`"all_frames": true` in manifest.json)
- [x] `"match_about_blank": true` für dynamisch erzeugte iframes
- [x] `content.js`: Top-Frame kommuniziert mit Child-Frames via `chrome.runtime.sendMessage` + `frameId`
- [x] Banner-Erkennung in iframes: Ergebnis wird an Top-Frame gemeldet
- [x] Aktion (z. B. Klick) kann im iframe ausgeführt werden
- [x] Kein Cross-Origin-Leak: Nur Kommunikation innerhalb der eigenen Extension-Frames

**Warum wichtig:** Viele Consent-Management-Plattformen (CMPs) laden ihre Banner in iframes (z. B. Sourcepoint, Funding Choices). Ohne Iframe-Support werden diese Banner komplett ignoriert.

### v1.3.0 - Verbessertes Klick-Timing (umgesetzt)
- [x] **DOM-Stillness-Detection**: Statt festem 500ms-Timeout auf DOM-Ruhe warten (MutationObserver-basiert)
- [x] Timeout pro Strategie konfigurierbar (TIMING-Konstanten)
- [x] Event-Warten: Adaptive settings panel detection (polling statt fixed delay)
- [x] Retry-Logik: Wenn erster Klickversuch fehlschlägt, erneut scannen nach 500ms

**Begründung:** Viele Banner laden verzögert oder werden erst nach User-Interaktion sichtbar. Ein adaptives Timing-System erhöht die Trefferquote.

### v1.4.0 - URL-basierte Regel-Filterung (umgesetzt)
- [x] `rules/rules.json`: Jede Regel erhält optionales `urlPattern` (Array von Regex/Strings)
- [x] `selectors.js` prüft vor Selektor-Matching, ob die aktuelle URL zur Regel passt
- [x] Performance-Gewinn: Keine unnötigen DOM-Queries auf Seiten ohne relevante Banner
- [x] Ermöglicht spezifische Regeln für einzelne Domains (z. B. `["^https://www\\.example\\.com/"]`)

### v1.5.0 - Mehrstufige Disable-Funktion (umgesetzt)
- [x] Popup: Dropdown "Disable on this site" mit Optionen:
  - "For 30 minutes" (Session-basiert, in `chrome.storage.local`)
  - "For 1 hour"
  - "For 24 hours"
  - "Permanently" (Whitelist, heutiges Verhalten)
- [x] `content.js`: Prüft alle Disable-Stufen vor `processPage()`
- [x] Automatisches Re-Enable nach Ablauf der temporären Disable-Frist (`_cleanExpiredDisables`)

### v1.6.0 - Tab-Status-System (umgesetzt)
- [x] `background.js`: State-Map pro Tab (`pending`, `rejected`, `hidden`, `skipped`, `disabled`)
- [x] Content Script meldet Zustandsänderungen an Background
- [x] Popup zeigt aktuellen Tab-Status als Icon + Text
- [x] Icon-Badge im Toolbar-Icon: Farbiger Punkt (grün = rejected, orange = skipped, blau = hidden, grau = disabled)
- [x] `chrome.action.setBadgeText()` / `setBadgeBackgroundColor()` für schnellen Status-Check

### v1.7.0 - Seiten-Indikator (Mini-Overlay) (umgesetzt)
- [x] Optionaler, dezentraler Indikator auf der Webseite selbst (kein Popup nötig)
- [x] Kleiner farbiger Punkt (28x28) in der unteren rechten Ecke, erscheint für 3 Sekunden nach Aktion
- [x] Farbcodiert: Grün = rejected, Blau = hidden, Orange = skipped
- [x] Nur im Top-Frame, selbstreinigend nach Fade-Out

### v1.8.0 - Fehler-Report Mechanismus (umgesetzt)
- [x] Popup Dev-Tab: "Report Issue" Button
- [x] Öffnet GitHub Issue Template mit vorausgefüllten Feldern:
  - Domain, Extension-Version, Browser
- [x] Kein automatisches Senden — Nutzer wird auf GitHub Issues geleitet
- [x] Keine automatische Datenübermittlung, kein Telemetrie-Endpunkt

### v1.9.0 - Observer-Optimierung (umgesetzt)
- [x] Rate-Limiting: `processPage()` maximal alle 2 Sekunden
- [x] Reduziert CPU-Last auf Seiten mit vielen DOM-Mutationen (Social Media, SPAs)

### v2.0.0 - Bessere Text-Erkennung für Ablehn-Buttons (umgesetzt)
- [x] Erweiterte Keyword-Liste in `rules/rules.json` (Sprachen: en, de, fr, es, it, nl, pl, sv, no)
- [x] Button-Ranking mit Scoring (exact=100, startsWith=75, contains=50)
- [x] Accessibility-First: ARIA-Rollen, Labels und Descriptions auswerten
- [x] Negation-Erkennung: don't/doesn't/won't verhindert Fehlklicks auf Accept-Buttons

## Wichtige Architekturentscheidung: Regel-Datenbank

### Problem
Die aktuelle `selectorMeta.js` ist eine hartkodierte JS-Datei mit 12 Providern. Neue Provider hinzuzufügen erfordert JavaScript-Kenntnisse und das Editieren von Sourcecode. Das schreckt Contributor ab und ist fehleranfällig.

### Lösung: `rules/rules.json`

Eine zentrale JSON-Datei im Repository, die alle Banner-Regeln enthält. Contributor (auch ohne JS-Kenntnisse) können neue Provider per Pull Request hinzufügen.

**Datei:** `extension/rules/rules.json`

```json
{
  "version": "1.1.0",
  "providers": [
    {
      "id": "onetrust",
      "name": "OneTrust",
      "url": "https://www.onetrust.com",
      "selectors": {
        "container": "#onetrust-banner-sdk",
        "rejectAll": "#onetrust-reject-all-handler, .ot-sdk-row button[aria-label*=\"reject\" i]",
        "settings": "#onetrust-pc-btn-handler",
        "saveSettings": ".save-preference-btn-handler",
        "acceptAll": "#onetrust-accept-btn-handler"
      }
    },
    {
      "id": "custom-site",
      "name": "Example Site Banner",
      "url": null,
      "urlPattern": ["^https://(www\\.)?example\\.com/"],
      "selectors": {
        "container": "#cookie-layer",
        "rejectAll": ".btn-reject",
        "close": ".cookie-close"
      }
    }
  ],
  "globalKeywords": {
    "reject": [
      "reject all", "reject all cookies", "reject", "decline", "decline all",
      "deny", "deny all", "refuse", "refuse all", "only necessary",
      "alles ablehnen", "alle ablehnen", "ablehnen", "nur notwendige",
      "verweigern", "alle verweigern"
    ],
    "settings": [
      "settings", "options", "more", "customize", "configure",
      "einstellungen", "optionen", "mehr", "konfigurieren",
      "manage", "manage cookies", "cookie settings", "cookie preferences"
    ],
    "save": [
      "save", "confirm", "save & close", "save and exit",
      "speichern", "bestätigen", "übernehmen", "auswahl speichern"
    ],
    "allowedCategories": [
      "necessary", "essential", "functional",
      "notwendig", "essentiell", "funktional"
    ]
  }
}
```

**Schema-Regeln:**
- `id`: Eindeutiger Slug (lowercase, no spaces)
- `name`: Anzeigename
- `url`: Provider-Website oder `null`
- `urlPattern` (optional): Array von Regex-Strings für URL-Filterung. Wenn gesetzt, wird die Regel nur auf passenden Domains ausgeführt.
- `selectors`:
  - `container` (Pflicht): CSS-Selektor für den Banner-Container
  - `rejectAll` (optional): Selektor für den "Alle ablehnen"-Button
  - `settings` (optional): Selektor für den "Einstellungen"-Button
  - `saveSettings` (optional): Selektor für den "Speichern"-Button im Einstellungs-Menü
  - `acceptAll` (optional): Selektor für den "Alle akzeptieren"-Button (nur für Negativ-Erkennung)
  - `close` (optional): Selektor für Schließen/X-Button

### Wie es geladen wird

1. `rules/rules.json` wird als Content Script injiziert (in `manifest.json` unter `"js"` eintragen, oder via `fetch` aus dem Extension-Bundle)
2. `src/rules.js` parst die JSON-Daten und stellt sie als `window.BANNER_RULES` zur Verfügung
3. `selectors.js` und `clicker.js` nutzen `BANNER_RULES` statt der alten `BANNER_SELECTORS`/`REJECT_TEXTS`-Konstanten
4. Die `globalKeywords` ersetzen die hartkodierten Arrays in `clicker.js`

**Warum kein Remote-Fetching:**
- Verstoß gegen Privacy-First-Prinzip: Keine externen Requests zur Laufzeit
- Sicherheitsrisiko: Kompromittierte Regel-Server könnten bösartige Selektoren einschleusen
- DSGVO: Jeder externe Request ist potenziell datenschutzrelevant
- Store-Updates sind der etablierte, sichere Weg für Content-Updates

## Technische Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Manifest V3** | Zukunftssicher, von Chrome gefordert, Firefox-kompatibel |
| **Kein Framework** | Vanilla JS für minimale Größe und keine Supply-Chain-Risiken |
| **CSS-Selektor-DB statt ML** | Transparent, debuggable, keine externen Abhängigkeiten |
| **Storage.local (nicht sync)** | Keine Datenübertragung an Browser-Sync-Server |
| **Keine externen CDNs** | Alle Assets lokal gebündelt, Privacy-First |
| **Keine Remote-Regel-Updates** | Sicherheitsrisiko, DSGVO-Problem. Regeln via Store-Update. |
| **rules/rules.json statt JS-Module** | Contributor-freundlich, kein JS nötig für neue Provider |
| **MIT-Lizenz** | Maximale Freiheit für Nutzer und Beitragende |

## Datenschutz-Prinzipien

1. **Keine Datenverarbeitung außerhalb des Browsers** - Alles läuft lokal
2. **Keine Telemetrie, kein Tracking, keine Analytics**
3. **Minimale Berechtigungen** - Nur was für die Funktion nötig ist
4. **Transparenz** - Vollständig quelloffen, jeder kann den Code prüfen
5. **Keine externen Requests** - Kein Kontakt zum Entwickler, keinen Dritt-Servern
6. **Keine Remote-Code-Ausführung** - Keine fremden Skripte, kein `eval()`, kein dynamisches Regel-Laden

## Entwicklungskonventionen

- Code-Sprache: Englisch (Kommentare, Variablen, Funktionen)
- UI/UX Sprache: Englisch + Deutsch (i18n)
- Git-Branch-Strategie: `main` (stable), `dev` (development), Feature-Branches
- Commit-Konvention: [Conventional Commits](https://www.conventionalcommits.org/)
- Testing: Jest für Unit-Tests, Playwright/Puppeteer für E2E (später)
- Linting: ESLint mit `eslint:recommended`
- Formatierung: Prettier
- **Kein Code aus Fremdprojekten kopieren** - Inspiration ja, Kopie nein
- **Keine Referenzen auf Fremdprojekte** - Weder in Code-Kommentaren noch in Dokumentation

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
├── src/
│   ├── background.js      # Service Worker
│   ├── content.js         # Content Script (Orchestration)
│   ├── storage.js         # Storage-Abstraktion + Statistiken
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
- [ ] Iframe-basierte Banner
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

## Technische Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Manifest V3** | Zukunftssicher, von Chrome gefordert, Firefox-kompatibel |
| **Kein Framework** | Vanilla JS für minimale Größe und keine Supply-Chain-Risiken |
| **CSS-Selektor-DB statt ML** | Transparent, debuggable, keine externen Abhängigkeiten |
| **Storage.local (nicht sync)** | Keine Datenübertragung an Browser-Sync-Server |
| **Keine externen CDNs** | Alle Assets lokal gebündelt, Privacy-First |
| **MIT-Lizenz** | Maximale Freiheit für Nutzer und Beitragende |

## Datenschutz-Prinzipien

1. **Keine Datenverarbeitung außerhalb des Browsers** - Alles läuft lokal
2. **Keine Telemetrie, kein Tracking, keine Analytics**
3. **Minimale Berechtigungen** - Nur was für die Funktion nötig ist
4. **Transparenz** - Vollständig quelloffen, jeder kann den Code prüfen
5. **Keine externen Requests** - Kein Contact zum Entwickler, keinen Dritt-Servern

## Entwicklungskonventionen

- Code-Sprache: Englisch (Kommentare, Variablen, Funktionen)
- UI/UX Sprache: Englisch + Deutsch (i18n)
- Git-Branch-Strategie: `main` (stable), `dev` (development), Feature-Branches
- Commit-Konvention: [Conventional Commits](https://www.conventionalcommits.org/)
- Testing: Jest für Unit-Tests, Playwright/Puppeteer für E2E (später)
- Linting: ESLint mit `eslint:recommended`
- Formatierung: Prettier

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

### 4. Interne Statistik
- Anzahl erkannter Cookie-Banner
- Anzahl erfolgreich abgelehnter Banner
- Anzahl nicht bearbeitbarer Banner (gefunden, aber kein Button)
- Anzahl ausgeblendeter Banner (nur im aggressiven Modus)
- Statistik per Domain und global
- Lokale Speicherung via `chrome.storage.local` (keine externe Datenübermittlung)

### 5. Popup-UI
- Anzeige der aktuellen Seite und ob ein Banner erkannt/behandelt wurde
- Statistiken einsehbar
- Toggle für "Sanft" vs. "Aggressiv" Modus
- Domain-Whitelist zum Deaktivieren auf bestimmten Seiten
- Dark Mode Support

## Technische Architektur

### Komponenten
```
extension/
├── manifest.json          # Extension Manifest (MV3)
├── src/
│   ├── background.js      # Service Worker (Event-Seite)
│   ├── content.js         # Content Script (DOM-Zugriff)
│   ├── detector.js        # Banner-Erkennungslogik
│   ├── clicker.js         # Button-Findungs- und Klicklogik
│   ├── stats.js           # Statistik-Modul
│   └── storage.js         # Storage-Abstraktion
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
1. **Page Load** → Content Script injiziert → `detector.js` scannt DOM auf Cookie-Banner
2. **Banner erkannt** → `clicker.js` sucht nach passendem Button → führt Klick aus
3. **Ergebnis** → `stats.js` aktualisiert Zähler → persistiert via `chrome.storage.local`
4. **Popup öffnen** → Liest Stats aus Storage → Zeigt aktuelle Infos an

### Berechtigungen (minimales Prinzip)
- `<all_urls>` oder `activeTab` + Host-Permissions für DOM-Zugriff
- `storage` für Statistiken und Einstellungen
- Keine `cookies`, `webRequest` oder andere invasive Permission

## Roadmap

### v0.1.0 - MVP / Prototyp
- [x] Projektstruktur und Build-Pipeline
- [ ] Banner-Erkennung (Keyword-basiert + grundlegende Selektoren)
- [ ] Reject-All-Klick (einfaches Text-Matching)
- [ ] Basis-Statistik (Anzahl rejected)
- [ ] Popup mit Statistik-Anzeige
- [ ] Sanft-Modus (kein Ausblenden, wenn kein Button)

### v0.2.0 - Verbesserte Erkennung
- [ ] Erweiterte Selektordatenbank (OneTrust, Cookiebot, etc.)
- [ ] Shadow-DOM Unterstützung
- [ ] Iframe-basierte Banner
- [ ] "Mehr Optionen" → Alle Toggles deaktivieren

### v0.3.0 - Erweiterte Features
- [ ] Aggressiv-Modus (Banner ausblenden)
- [ ] Domain-Whitelist
- [ ] i18n (Deutsch + Englisch)
- [ ] Dark Mode

### v1.0.0 - Release
- [ ] Vollständige Testabdeckung
- [ ] Performance-Optimierung (MutationObserver statt Polling)
- [ ] Store-Listing vorbereiten (Firefox Add-ons + Chrome Web Store)
- [ ] Firefox + Chrome ZIP-Builds via CI/CD

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

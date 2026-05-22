<h1 align="center">🐨 KoalaCookies</h1>

<p align="center">
  <strong>Automatically reject cookie consent banners. Privacy-first, open source.</strong>
</p>

<p align="center">
  <a href="https://github.com/Shik3i/KoalaCookies/releases">
    <img src="https://img.shields.io/github/v/release/Shik3i/KoalaCookies?label=Version&color=2e7d32" alt="Version">
  </a>
  <a href="https://github.com/Shik3i/KoalaCookies/releases/latest">
    <img src="https://img.shields.io/badge/Firefox-FF7139?logo=firefox&logoColor=white" alt="Firefox">
  </a>
  <a href="https://github.com/Shik3i/KoalaCookies/releases/latest">
    <img src="https://img.shields.io/badge/Chrome-4285F4?logo=googlechrome&logoColor=white" alt="Chrome">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/Shik3i/KoalaCookies?color=2e7d32" alt="MIT License">
  </a>
  <a href="https://github.com/Shik3i/KoalaCookies">
    <img src="https://img.shields.io/badge/Open%20Source-2e7d32" alt="Open Source">
  </a>
</p>

<p align="center">
  KoalaCookies detects cookie consent banners on any website and clicks the <strong>"Reject All"</strong> button for you — instantly, silently, and privately. No data ever leaves your browser.
</p>

---

## Features

| Category | Capabilities |
|---|---|
| 🚫 **Automatic Rejection** | Detects banners and clicks "Reject All" / "Decline" / "Nur notwendige" — with retry and adaptive timing |
| 🔍 **Smart Detection** | Recognizes 12+ providers (OneTrust, Cookiebot, Usercentrics, etc.) with keyword fallback, Shadow DOM, and **iframe support** |
| 🌐 **10 Languages** | Button keywords in English, German, French, Spanish, Italian, Dutch, Polish, Swedish, Norwegian |
| 🛡️ **Two Modes** | **Gentle** — leaves banner visible if no reject button found; **Aggressive** — hides the banner entirely |
| ⏱️ **Multi-level Disable** | Disable permanently, for 30 minutes, 1 hour, or 24 hours — with re-enable button showing remaining time |
| 🔔 **Toolbar Badge** | Colored icon badge: green ✓ = rejected, orange ! = skipped, blue ✕ = hidden, gray — = disabled |
| 💬 **Page Indicator** | Small colored dot in the bottom-right corner after each action — disappears after 3 seconds |
| 🎯 **Element Picker** | Hover-highlight DOM elements and capture them as custom selectors for banner detection |
| 🧩 **Custom Selectors** | User-captured selectors take priority in the detection pipeline before built-in providers |
| 📊 **Statistics** | Tracks detected, rejected, skipped, and hidden banners per domain and globally |
| 📝 **Action Log** | Last 10 actions with timestamp, domain, method, and button text — copyable as formatted text |
| 🐞 **Dev Tools** | Per-page debug info + scrollable list of all known providers with CSS selectors + **Report Issue button** |
| 🌙 **Dark Mode** | Respects your system preference automatically |
| 🌍 **i18n** | English and German translations for full UI including Dev tab |
| 🔒 **Privacy-First** | 100% local — no external connections, no tracking, no analytics, no remote rule fetching |
| 📦 **Zero Dependencies** | Pure vanilla JavaScript, no npm packages, no CDNs, no frameworks |

## Installation

> ⚠️ KoalaCookies is currently in development. Load it temporarily or download from [releases](https://github.com/Shik3i/KoalaCookies/releases).

### Firefox

1. Download the latest `koala_cookies_firefox_v*.zip` from the [releases page](https://github.com/Shik3i/KoalaCookies/releases/latest)
2. Open `about:debugging` → This Firefox → **Load Temporary Add-on**
3. Select the zip file

### Chrome / Chromium

1. Download the latest `koala_cookies_chrome_v*.zip` from the [releases page](https://github.com/Shik3i/KoalaCookies/releases/latest)
2. Extract the zip to a folder
3. Open `chrome://extensions` → Enable **Developer mode** → **Load unpacked**
4. Select the extracted folder

## How It Works

```
User visits a website
        │
        ▼
Content script injects in all frames ──► scans DOM
        │                          │
        │              ┌───────────┴───────────┐
        │              ▼                       ▼
        │       Provider match?        Keyword match?
        │       (rules.json)           (rules.json)
        │              │                       │
        │              └───────────┬───────────┘
        │                          ▼
        │                  Banner detected
        │                          │
        │              ┌───────────┴───────────┐
        │              ▼                       ▼
        │       Reject button found?   Settings menu found?
        │       (clicker.js)           (clicker.js)
        │              │                       │
        │              ├─── Retry (500ms)       │
        │              │                       │
        │              └───────────┬───────────┘
        │                          ▼
        │                   Action performed
        │              (rejected / hidden / skipped)
        │                          │
        │              ┌───────────┴───────────┐
        │              ▼                       ▼
        │      Toolbar badge updated    Page indicator shown
        │              │                       │
        │              └───────────┬───────────┘
        │                          ▼
        │              Message sent to background
        │                          │
        │                          ▼
        │              Stats + log written to
        │              chrome.storage.local
        │                          │
        ▼                          ▼
  User sees result in popup (Stats / Log / Dev tabs)
```

## Privacy

KoalaCookies processes **everything locally** in your browser. It makes **zero network requests** of its own, collects **no telemetry**, sets **no cookies**, and sends **no data** anywhere.

All data (statistics, action log, settings, whitelist) is stored exclusively in [`chrome.storage.local`](https://developer.chrome.com/docs/extensions/reference/api/storage) — the browser's sandboxed local storage that never syncs to any server.

[📄 Read the full privacy policy](docs/privacy.md)

## Development

### Prerequisites

- A modern browser (Firefox 109+ or Chromium-based)
- Node.js 18+ (for build scripts)
- Git

### Project Structure

```
KoalaCookies/
├── docs/                  # Documentation (architecture, privacy, roadmap)
│   ├── ai_init.md         # Implementation plan & vision
│   ├── architecture.md    # Technical architecture
│   └── privacy.md         # Privacy policy
├── extension/             # Extension source code
│   ├── manifest.json      # Extension manifest (MV3)
│   ├── rules.json         # Central rule database (providers + keywords)
│   ├── src/               # JavaScript modules
│   │   ├── background.js  # Service worker (message router, stats, tab state, badge, picker injection)
│   │   ├── content.js     # Content script (DOM scan, click orchestration, retry, page indicator, SPA/iframe support)
│   │   ├── storage.js     # chrome.storage.local abstraction + stats lock + expired disable cleanup
│   │   ├── rulesEngine.js # Rules loader (fetches rules.json, provides provider/keyword data)
│   │   ├── selectors.js   # Banner detection (custom → providers → keywords → Shadow DOM + urlPattern filtering)
│   │   ├── clicker.js     # Button finding + click strategies (text scoring, settings panel, adaptive wait, hide)
│   │   └── picker.js      # Element picker (hover highlighter + DOM element capture)
│   ├── popup/             # Popup UI (Stats, Log, Dev tabs)
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── styles/            # Global CSS variables + dark mode
│   ├── _locales/          # Translations (en, de)
│   └── icons/             # Extension icons
├── scripts/               # Build & utility scripts
│   ├── build.sh           # Build Firefox + Chrome ZIPs
│   ├── generate-icons.sh  # Generate icons via Python
│   └── generate_icons.py  # Python script: creates PNG icons from code
├── .github/workflows/     # CI/CD pipelines
│   └── release.yml        # Auto-builds and publishes on tag push
└── README.md
```

### Building

```bash
# Build both Firefox and Chrome packages
bash scripts/build.sh

# Output is in releases/
```

The build script:
1. Reads the version from `extension/manifest.json` (or `$1` argument)
2. Creates a Firefox-compatible ZIP with `browser_specific_settings.gecko` (configurable via `$FIREFOX_EXTENSION_ID`)
3. Creates a Chrome-compatible ZIP (strips Firefox-specific keys)
4. Injects the version number into `popup.html`

### Loading from Source

- **Firefox:** `about:debugging` → This Firefox → Load Temporary Add-on → Select `extension/manifest.json`
- **Chrome:** `chrome://extensions` → Developer Mode → Load unpacked → Select `extension/` folder

### Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/build.sh` | Builds Firefox + Chrome ZIP packages |
| `scripts/generate-icons.sh` | Regenerates extension icons from Python |
| `scripts/generate_icons.py` | Generates PNG icons programmatically (no external tools) |

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feat/amazing-feature`)
3. **Make your changes** (keep it vanilla JS, no external deps)
4. **Test** locally in Firefox and Chrome
5. **Open a Pull Request**

See [docs/ai_init.md](docs/ai_init.md) for the full implementation roadmap and coding conventions.

## Links

- [📖 Architecture](docs/architecture.md)
- [🔒 Privacy Policy](docs/privacy.md)
- [🗺️ Roadmap](docs/ai_init.md)
- [🐛 Issue Tracker](https://github.com/Shik3i/KoalaCookies/issues)
- [💬 Discussions](https://github.com/Shik3i/KoalaCookies/discussions)

## License

MIT License — see [LICENSE](LICENSE) for details.

Copyright (c) 2026 KoalaCookies Contributors

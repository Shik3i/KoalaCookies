# KoalaCookies - Architecture

## Overview

KoalaCookies is a Manifest V3 browser extension. It consists of a Background Service Worker, a Content Script (injected into all frames), and a Popup UI.

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Popup UI   │    │  Background  │    │ Content Script│  │
│  │              │    │    Service   │    │               │  │
│  │  popup.html  │◄──►│   Worker     │◄──►│ content.js    │  │
│  │  popup.js    │    │              │    │ storage.js    │  │
│  │  popup.css   │    │ background.js│    │ rulesEngine.js│  │
│  └──────────────┘    │ storage.js   │    │ selectors.js  │  │
│                      │ rulesEngine.js│   │ clicker.js    │  │
│                      │ selectorMeta.js│  │ picker.js     │  │
│                      └──────┬───────┘    └───────────────┘  │
│                      │  Storage API  │                       │
│                      │               │                       │
│                      │  chrome.storage│                      │
│                      │    .local     │                       │
│                      └───────────────┘                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Tab States                        │    │
│  │  rejected / hidden / skipped / disabled / no_banner  │    │
│  │  → Badge icon on toolbar                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │                                          │
          ▼                                          ▼
  ┌──────────────┐                         ┌────────────────┐
  │   Webseite   │                         │    Webseite    │
  │              │                         │                │
  │ Cookie-Banner│◄──── Injection ──────── │  DOM-Zugriff   │
  │  wird auto.  │    (all frames)         │  Klick-         │
  │  abgelehnt   │                         │  Simulation     │
  │              │                         │                │
  │  Page Indicator (3s)                   │                │
  └──────────────┘                         └────────────────┘
```

## Components in Detail

### 1. Rule Database (`extension/rules/rules.json`)

**Purpose:** Central, human-readable JSON file defining all known banner providers and keyword lists. Contributors can add new providers by editing this file — no JavaScript knowledge required.

**Schema:**
```json
{
  "version": "1.1.0",
  "providers": [
    {
      "id": "onetrust",
      "name": "OneTrust",
      "url": "https://www.onetrust.com",
      "urlPattern": ["^example\\.com$"],
      "selectors": {
        "container": "#onetrust-banner-sdk",
        "rejectAll": "...",
        "settings": "...",
        "saveSettings": "...",
        "acceptAll": "...",
        "close": "..."
      }
    }
  ],
  "globalKeywords": {
    "reject": ["reject all", ...],
    "settings": ["settings", ...],
    "save": ["save", ...],
    "allowedCategories": ["necessary", ...],
    "acceptIndicators": ["accept all", ...],
    "negations": ["do not", ...]
  },
  "detectionKeywords": {
    "banner": ["cookie", "consent", ...]
  }
}
```

- `urlPattern` (optional): Array of regex strings. If set, the provider is only checked on matching hostnames.
- `acceptIndicators`: Used to detect and avoid clicking "Accept All" buttons by mistake.
- `negations`: Contractions like "don't", "won't" that invert accept-button detection.

**Updates:** Rules are bundled with the extension. New providers reach users exclusively through Firefox/Chrome Web Store updates. No remote fetching — ever.

### 2. Rules Engine (`extension/src/rulesEngine.js`)

**Purpose:** Loads `rules/rules.json` at runtime (via `fetch(chrome.runtime.getURL('rules/rules.json'))`) and provides synchronous getters for the data. Works in both content script and service worker contexts.

**API:**
- `RulesEngine.ready()` — Returns a promise that resolves when rules are loaded.
- `RulesEngine.getProviders()` — Returns the array of provider objects.
- `RulesEngine.getKeywords()` — Returns the `globalKeywords` object.
- `RulesEngine.getDetectionKeywords()` — Returns the banner detection keyword array.
- `RulesEngine.getProviderMeta(id)` — Returns `{name, url}` for a given provider ID.
- `RulesEngine.getAllProviderMeta()` — Returns `[{id, name, url}, ...]` for all providers.

On fetch failure, falls back to empty defaults (so the extension still functions without keywords).

### 3. Content Script (`extension/src/content.js`)

**Purpose:** Injected into every page (including iframes). Has DOM access. Orchestrates detection and clicking.

**Lifecycle:**
1. Injected at `document_idle` in all frames (`all_frames: true`, `match_about_blank: true`).
2. `rulesEngine.js` loads `rules/rules.json` asynchronously.
3. `selectors.js` provides `detectBanner()` (async), which scans for banners.
4. On match: `clicker.js` finds and clicks the "Reject All" button with retry logic.
5. Result is sent to background via `chrome.runtime.sendMessage()`.
6. A page indicator (colored dot) appears in the bottom-right corner for 3 seconds.

**Detection Pipeline (`selectors.js`):**
- **Custom Selectors:** User-captured DOM element profiles checked first.
- **Provider Selectors:** CSS selectors from `rules/rules.json` providers, filtered by `urlPattern`.
- **Keyword Matching:** Fallback scanning for cookie/consent-related text in likely container elements.
- **Shadow DOM:** Recursive TreeWalker through all shadow roots, checking provider selectors.

**Click Strategies (`clicker.js`):**
1. Provider-specific CSS selector match.
2. Text matching with scoring (exact=100, startsWith=75, contains=50).
3. Accept-button filtering via `acceptIndicators` and `negations`.
4. Retry after 500ms if first attempt fails.
5. Settings menu: Find "Settings" → open → toggle all non-essential checkboxes → save.
6. Settings panel uses adaptive wait (polls for toggles every 150ms, 5s timeout).

**Fallback Behavior:**
- `mode: "gentle"` (default): No button found → leave banner visible, report "skipped".
- `mode: "aggressive"`: No button found → try close button, then remove the banner element.

**SPA & Iframe Support:**
- `popstate` event listener for client-side navigation.
- MutationObserver with URL comparison for pushState-based SPAs.
- `load` event listener for iframe navigation.
- Rate limiting: max one `processPage()` call per 2 seconds.

**Page Indicator:**
- Small circular overlay (bottom-right, 28px, colored by action).
- Green = rejected, blue = hidden, orange = skipped.
- Fades in (0.3s), stays 3s, fades out (0.3s), then removes itself.

### 4. Background Service Worker (`extension/src/background.js`)

**Purpose:** Coordinates messages, persists statistics, manages settings, tracks tab states, sets toolbar badges.

**Events:**
- `chrome.runtime.onMessage` — Handles 18 message types (see below).
- `chrome.runtime.onInstalled` — Initializes default settings, including `disabledUntil`.
- `chrome.tabs.onRemoved` / `onActivated` / `onUpdated` — Tab state lifecycle.
- `importScripts('rulesEngine.js', 'selectorMeta.js', 'storage.js')` — Loads modules.

**Message Types:**
| Type | Direction | Purpose |
|------|-----------|---------|
| `bannerResult` | Content → BG | Record banner action, update stats, update tab state |
| `bannerDisabled` | Content → BG | Report that the page is whitelisted/disabled |
| `getPopupData` | Popup → BG | Get stats + settings for popup |
| `getStats` | Popup → BG | Get stats only |
| `getSettings` | Popup → BG | Get mode, whitelist, disabledUntil |
| `setMode` | Popup → BG | Switch gentle/aggressive |
| `addToWhitelist` | Popup → BG | Permanently disable on domain |
| `disableDomain` | Popup → BG | Temporarily disable (with durationMs) |
| `enableDomain` | Popup → BG | Re-enable (remove whitelist + disabledUntil) |
| `removeFromWhitelist` | Popup → BG | Legacy — forwarded to enableDomain |
| `resetStats` | Popup → BG | Clear all statistics |
| `getActionLog` | Popup → BG | Get last 10 action entries |
| `getDevInfo` | Popup → BG | Get banner detection info per domain |
| `getSelectorList` | Popup → BG | Get all known providers with selectors |
| `getTabState` | Popup → BG | Get current tab's state |
| `startPicker` | Popup → BG | Inject element picker into active tab |
| `pickerElementCaptured` | Picker → BG | Save custom selector from picker |
| `pickerCancelled` | Picker → BG | Picker dismissed |
| `getCustomSelectors` | Popup → BG | Get user-captured custom selectors |
| `removeCustomSelector` | Popup → BG | Delete a custom selector |

**Tab State System:**
- `tabStates` map: `{ tabId: { state, domain, timestamp } }`.
- States: `rejected`, `hidden`, `skipped`, `disabled`, `no_banner`.
- Badge icon updates: green ✓ (rejected), blue ✕ (hidden), orange ! (skipped), gray — (disabled).
- Cleared on tab navigation or close. Restored on tab activation.

### 5. Popup UI (`extension/popup/`)

**Purpose:** Displays statistics, settings, and debug information.

**Tabs:**
- **Stats Tab:** Current domain status, global statistics (detected/rejected/skipped/hidden), mode selector, multi-level disable dropdown (30min/1hr/24hr/permanent), reset button.
- **Log Tab:** Last 10 actions with timestamp, domain, action, method, detail. "Copy as Text" button for formatted clipboard export.
- **Dev Tab:**
  - Debug Info (provider, detection method, container, action, result, last seen).
  - Element Picker (hover highlighter + DOM element capture).
  - Custom Selectors list with remove option.
  - Known Providers (collapsible list with CSS selectors).
  - **Report Issue** button (opens pre-filled GitHub issue).

**Multi-level Disable:**
- Dropdown: "For 30 minutes" / "For 1 hour" / "For 24 hours" / "Permanently".
- Re-enable button shows remaining time for temporary disables (e.g., "Re-enable (disabled for 25 min)").
- Double-click on re-enable button opens whitelist management list.

### 6. Storage (`extension/src/storage.js`)

**Purpose:** Abstraction over `chrome.storage.local` with defaults, serialization, and cleanup.

**Data Model:**
```json
{
  "mode": "gentle",
  "whitelist": [],
  "disabledUntil": {
    "example.com": 1716470400000
  },
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
  },
  "customSelectors": [...]
}
```

- `disabledUntil`: Map of domain → expiration timestamp (ms). Auto-cleaned on read (expired entries removed).
- `updateStats()`: Uses a promise-lock to serialize stats updates (prevents race conditions).
- `_cleanExpiredDisables()`: Removes entries where `Date.now() > timestamp`.

### 7. Element Picker (`extension/src/picker.js`)

Injected content script for the element picker. Hover-highlighter with red outline, click captures DOM element profile (tagName, ID, classes, attributes, parent hierarchy) and sends it to the background service worker for storage as a custom selector.

## Permissions

```json
{
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

`<all_urls>` is required because cookie banners can appear on any domain. The extension never sends data externally.

## Build & Deployment

```
scripts/
├── build.sh           # Builds Firefox + Chrome ZIPs
├── generate-icons.sh  # Generates icons via Python
└── generate_icons.py  # Python script: creates PNG icons from code
```

**build.sh** produces:
1. `${RELEASE_DIR}/koala_cookies_firefox_vX.Y.Z.zip` — with `browser_specific_settings`.
2. `${RELEASE_DIR}/koala_cookies_chrome_vX.Y.Z.zip` — without Firefox-specific keys.

**CI/CD (.github/workflows/release.yml):**
- Triggered by tag push: `v*.*.*`.
- Runs `build.sh`.
- Creates GitHub Release with both ZIPs as assets.

## Privacy Principles

1. **No data processing outside the browser** — Everything runs locally.
2. **No telemetry, no tracking, no analytics** — Zero external communication.
3. **No remote rule fetching** — Rules are bundled, updated via Web Store.
4. **Minimal permissions** — Only what's functionally necessary.
5. **Fully open source** — MIT licensed, anyone can audit the code.

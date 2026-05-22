# KoalaCookies

A privacy-first browser extension that automatically rejects cookie consent banners. Available for Firefox and Chromium-based browsers.

## Features

- Automatic detection of cookie consent banners
- Auto-click "Reject All" / "Decline" buttons
- Two modes: **Gentle** (default) - leaves banner visible if no reject button found, **Aggressive** (optional) - hides the banner
- Local statistics tracking (no data leaves your browser)
- Domain whitelist
- Dark mode support
- German & English translations

## Privacy

KoalaCookies processes **everything locally**. No data is ever sent anywhere. No analytics, no tracking, no external requests. [Read the full privacy policy](docs/privacy.md).

## Development

### Prerequisites

- A modern browser (Firefox 109+ or Chromium-based)
- Node.js 18+ (for build scripts)
- Git

### Project Structure

```
KoalaCookies/
├── docs/               # Documentation (architecture, privacy, AI init)
│   ├── ai_init.md      # Implementation plan & vision
│   ├── architecture.md # Technical architecture
│   └── privacy.md      # Privacy policy
├── extension/          # Extension source code
│   ├── manifest.json   # Extension manifest
│   ├── src/            # JavaScript modules
│   ├── popup/          # Popup UI
│   ├── styles/         # CSS styles
│   ├── _locales/       # Translations (en, de)
│   └── icons/          # Extension icons
├── scripts/            # Build & utility scripts
│   └── build.sh        # Build Chrome + Firefox packages
├── .github/workflows/  # CI/CD pipelines
└── README.md
```

### Building

```bash
# Build both Firefox and Chrome packages
bash scripts/build.sh

# Output is in releases/
```

### Loading in the Browser

- **Firefox:** `about:debugging` → This Firefox → Load Temporary Add-on → Select `extension/manifest.json`
- **Chrome:** `chrome://extensions` → Developer Mode → Load unpacked → Select `extension/` folder

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a Pull Request

See [docs/ai_init.md](docs/ai_init.md) for the implementation roadmap.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Architecture](docs/architecture.md)
- [Privacy Policy](docs/privacy.md)
- [Implementation Plan](docs/ai_init.md)
- [Issue Tracker](https://github.com/Shik3i/KoalaCookies/issues)

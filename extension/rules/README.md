# KoalaCookies Rule Database

This folder contains the central rule database that KoalaCookies uses to detect and reject cookie consent banners. The rules are shipped with the extension — no remote fetching.

## File

- **`rules.json`** — The single source of truth. Edit this file to add new providers or update keywords.

## How to Add a New Provider

1. Open `rules.json`
2. Add a new entry to the `providers` array:

```json
{
  "id": "myprovider",
  "name": "My Provider Name",
  "url": "https://www.example.com",
  "urlPattern": ["^www\\.example\\.com$"],
  "selectors": {
    "container": "#cookie-banner-id",
    "rejectAll": "button.reject-all, button[aria-label*=\"reject\" i]",
    "settings": "button.settings",
    "saveSettings": "button.save",
    "acceptAll": "button.accept-all",
    "close": ".close-button"
  }
}
```

### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Unique identifier (lowercase, no spaces, e.g. `onetrust`) |
| `name` | Yes | string | Display name shown in Dev tab |
| `url` | No | string or null | Provider website URL (shown as link in Dev tab) |
| `urlPattern` | No | string[] | Regex patterns to match against `hostname`. If set, the provider is only checked on matching domains. Example: `["^www\\.example\\.com$"]` |
| `selectors.container` | Yes | string | CSS selector for the banner container element |
| `selectors.rejectAll` | No | string | CSS selector for the "Reject All" / deny button |
| `selectors.settings` | No | string | CSS selector for the "Settings" / "More options" button |
| `selectors.saveSettings` | No | string | CSS selector for the "Save" / "Confirm" button in the settings panel |
| `selectors.acceptAll` | No | string | CSS selector for the "Accept All" button (used for negative detection — helps avoid misclicks) |
| `selectors.close` | No | string | CSS selector for the close/dismiss button |

### CSS Selector Tips

- Use case-insensitive attribute selectors with the `i` flag: `button[aria-label*="reject" i]`
- Combine multiple selectors with commas: `#btn-one, .btn-two, button[data-action="deny"]`
- Shadow DOM selectors only work if the element is in the same shadow root scope
- Test your selectors in the browser DevTools before submitting

### Adding Keywords

The `globalKeywords` section contains text patterns used for button detection when no provider-specific CSS selector matches:

- **`reject`** — Words/phrases indicating rejection (tested against button text, aria-label, title)
- **`settings`** — Words indicating a settings/options menu
- **`save`** — Words for save/confirm buttons
- **`allowedCategories`** — Category names that should NOT be toggled off (necessary, essential, functional)
- **`acceptIndicators`** — Words indicating acceptance (used to avoid misclicks)
- **`negations`** — Contractions like "don't" that invert accept-button detection

Add keywords in any language — KoalaCookies supports English, German, French, Spanish, Italian, Dutch, Polish, Swedish, and Norwegian.

### Detection Keywords

The `detectionKeywords.banner` array contains words used in the keyword-based banner detection fallback. When a page has no matching CSS selector from any known provider, KoalaCookies scans the DOM for elements containing at least 2 of these keywords.

## Testing Your Changes

1. Load the extension unpacked in Chrome/Firefox
2. Visit a page with the banner you're targeting
3. Open the extension popup → Dev tab → check if your provider appears under "Known Providers"
4. Check the Debug Info to see if detection succeeded

## Pull Request Checklist

- [ ] Provider `id` is unique (not already used)
- [ ] CSS selectors are tested and working in browser DevTools
- [ ] `urlPattern` is set if the provider is domain-specific (improves performance)
- [ ] `acceptAll` selector is included if available (prevents misclicks)
- [ ] Keywords added in the correct language section
- [ ] Provider name and URL are correct

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/extension"
RELEASE_DIR="$ROOT_DIR/releases"

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  VERSION=$(grep '"version"' "$EXTENSION_DIR/manifest.json" | sed 's/.*"version": "\(.*\)".*/\1/')
fi

echo "Building KoalaCookies v$VERSION..."

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# --- Firefox Build ---
echo "  -> Building Firefox package..."
FIREFOX_BUILD_DIR="$RELEASE_DIR/firefox-tmp"
rm -rf "$FIREFOX_BUILD_DIR"
cp -r "$EXTENSION_DIR" "$FIREFOX_BUILD_DIR"

# Add browser_specific_settings for Firefox
node -e "
const manifest = require(process.argv[1]);
manifest.browser_specific_settings = {
  gecko: {
    id: 'koalacookies@github.com',
    strict_min_version: '109.0'
  }
};
require('fs').writeFileSync(process.argv[1], JSON.stringify(manifest, null, 2));
" "$FIREFOX_BUILD_DIR/manifest.json"

# Inject version into popup.html
node -e "
const fs = require('fs');
const [file, version] = process.argv.slice(1);
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/__VERSION__/g, version);
fs.writeFileSync(file, html);
" "$FIREFOX_BUILD_DIR/popup/popup.html" "$VERSION"

FIREFOX_ZIP="$RELEASE_DIR/koala_cookies_firefox_v${VERSION}.zip"
(cd "$FIREFOX_BUILD_DIR" && zip -r "$FIREFOX_ZIP" . -x "*.DS_Store" "*/Thumbs.db")
rm -rf "$FIREFOX_BUILD_DIR"
echo "     Created: $FIREFOX_ZIP"

# --- Chrome Build ---
echo "  -> Building Chrome package..."
CHROME_BUILD_DIR="$RELEASE_DIR/chrome-tmp"
rm -rf "$CHROME_BUILD_DIR"
cp -r "$EXTENSION_DIR" "$CHROME_BUILD_DIR"

# Ensure no Firefox-specific keys in the manifest
node -e "
const manifest = require(process.argv[1]);
delete manifest.browser_specific_settings;
require('fs').writeFileSync(process.argv[1], JSON.stringify(manifest, null, 2));
" "$CHROME_BUILD_DIR/manifest.json"

# Inject version into popup.html
node -e "
const fs = require('fs');
const [file, version] = process.argv.slice(1);
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/__VERSION__/g, version);
fs.writeFileSync(file, html);
" "$CHROME_BUILD_DIR/popup/popup.html" "$VERSION"

CHROME_ZIP="$RELEASE_DIR/koala_cookies_chrome_v${VERSION}.zip"
(cd "$CHROME_BUILD_DIR" && zip -r "$CHROME_ZIP" . -x "*.DS_Store" "*/Thumbs.db")
rm -rf "$CHROME_BUILD_DIR"
echo "     Created: $CHROME_ZIP"

echo ""
echo "Build complete! Packages in $RELEASE_DIR"
ls -lh "$RELEASE_DIR"

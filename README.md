# Subdomain Storage Sync

[![npm version](https://badge.fury.io/js/subdomain-storage-sync.svg)](https://badge.fury.io/js/subdomain-storage-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, production-ready JavaScript library that automatically synchronizes `localStorage` and/or `sessionStorage` data across different subdomains using cookies.

## 🎯 Purpose

The browser's same-origin policy prevents `localStorage` and `sessionStorage` from being shared across different subdomains. This library solves that problem by using cookies set on the parent domain as a synchronization layer.

### Why Not Just Use Cookies Directly?

**The Problem**: Many third-party libraries, chat widgets, analytics tools, and applications are hardcoded to use `localStorage` or `sessionStorage`. You can't easily modify their source code to use cookies instead.

**The Solution**: This library acts as a transparent bridge. It automatically syncs storage data to cookies without requiring any changes to existing code. Your chat widget keeps using `sessionStorage` as designed, but now it magically works across subdomains.

**Real-World Example**:
```javascript
// Your chat widget's code (can't easily modify this)
sessionStorage.setItem('chatSessionId', '12345');
sessionStorage.setItem('chatUsername', 'John');

// Without this library: Data lost when moving to different subdomain ❌
// With this library: Data automatically syncs via cookies ✅
```

This means you can:
- ✅ Use third-party widgets across subdomains without modification
- ✅ Maintain chat sessions when users navigate from `www.example.com` to `shop.example.com`
- ✅ Keep user preferences consistent across `app.example.com` and `dashboard.example.com`
- ✅ Extend functionality of existing tools without touching their source code

## ✨ Features

- ✅ **Multiple Storage Types**: Support for `localStorage`, `sessionStorage`, or both
- ✅ **Flexible Sync Options**: Choose to overwrite existing keys or only sync missing ones
- ✅ **Zero Dependencies**: Pure vanilla JavaScript
- ✅ **Automatic Sync**: Works transparently with existing storage code
- ✅ **Bi-directional**: Syncs changes in both directions (storage ↔️ cookies)
- ✅ **Real-time**: Updates propagate immediately across subdomains
- ✅ **Configurable**: Sync all keys or just specific ones
- ✅ **Production-ready**: Comprehensive error handling and input validation
- ✅ **TypeScript Support**: Full TypeScript definitions included
- ✅ **Lightweight**: ~6KB minified

## 🌐 Browser Support

This library works in all modern browsers:

- ✅ **Chrome** 32+ (2014)
- ✅ **Firefox** 29+ (2014)
- ✅ **Safari** 8+ (2014)
- ✅ **Edge** 12+ (2015)
- ✅ **Opera** 19+ (2014)
- ❌ **Internet Explorer** (not supported due to lack of Promise support)

**Key Requirements:**
- `localStorage` / `sessionStorage` API
- `storage` event (for cross-tab sync)
- `Promise` API (for `ready()` method)
- `CustomEvent` API (for sync complete event)

**For IE11 Support:** If you need to support IE11, include a Promise polyfill like [es6-promise](https://github.com/stefanpenner/es6-promise) before loading this library.

## 📦 Installation

### NPM

```bash
npm install subdomain-storage-sync
```

### CDN

```html
<script src="https://unpkg.com/subdomain-storage-sync@latest/dist/index.js"></script>
```

### Direct Download

Download `dist/index.js` and include it in your project:

```html
<script src="path/to/index.js"></script>
```

**Important**: Load this script **before** any other scripts that use storage to ensure data is synced before your application initializes.

## 🚀 Quick Start

### Basic Usage (localStorage only)

```javascript
// No configuration needed - just include the script
localStorage.setItem("theme", "dark");

// On a different subdomain, the value is automatically available
console.log(localStorage.getItem("theme")); // "dark"
```

### sessionStorage Support

```javascript
// Configure to sync sessionStorage instead
StorageSync.config.storageType = 'sessionStorage';
StorageSync.reinitialize();

sessionStorage.setItem("temp-data", "value");
// Now syncs across subdomains via cookies
```

### Sync Both Storage Types

```javascript
// Configure to sync both localStorage and sessionStorage
StorageSync.config.storageType = 'both';
StorageSync.reinitialize();

localStorage.setItem("persistent", "value");
sessionStorage.setItem("temporary", "value");
// Both sync across subdomains
```

## ⚙️ Configuration

Configure the library by modifying `StorageSync.config`:

```javascript
StorageSync.config = {
  // Storage type to sync: 'localStorage', 'sessionStorage', or 'both'
  storageType: 'localStorage', // Default

  // Whether to overwrite existing keys when syncing from cookies
  overwriteExisting: false, // Default: only sync missing keys

  // Prefix for sync cookies to avoid naming conflicts
  cookiePrefix: 'sds_sync_',

  // Cookie expiration in seconds (default: 1 year)
  cookieMaxAge: 365 * 24 * 60 * 60,

  // Array of keys to sync. Empty array = sync all keys
  // Supports exact strings: ['sessionId', 'theme']
  // Supports RegExp patterns: [/^chat_/, /session$/]
  // Can mix both: ['exactKey', /^prefix_/]
  syncKeys: [],

  // Enable debug logging
  debug: false
};

// Apply configuration changes
StorageSync.reinitialize();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storageType` | `string` | `'localStorage'` | Storage type: `'localStorage'`, `'sessionStorage'`, or `'both'` |
| `overwriteExisting` | `boolean` | `false` | Whether to overwrite existing keys when syncing from cookies |
| `cookiePrefix` | `string` | `'sds_sync_'` | Prefix for sync cookies |
| `cookieMaxAge` | `number` | `31536000` | Cookie expiration in seconds |
| `syncKeys` | `Array<string\|RegExp>` | `[]` | Keys to sync (strings or RegExp patterns, empty = all keys) |
| `debug` | `boolean` | `false` | Enable debug logging |

## 🔄 Sync Behavior

### Default Behavior (Safe Mode)

By default, `overwriteExisting: false` means:
- On first load of a subdomain, missing keys are synced from cookies
- Existing local keys are **never** overwritten
- This prevents newer local data from being overwritten by potentially stale cookie data

### Overwrite Mode

With `overwriteExisting: true`:
- Cookie values always overwrite local storage values
- Use when you want cookie data to be the "source of truth"
- **Caution**: Local changes may be lost

### Pattern Matching with syncKeys

The `syncKeys` configuration supports both exact strings and RegExp patterns for flexible key matching:

```javascript
// Exact string matches only
StorageSync.config.syncKeys = ['sessionId', 'theme', 'userPrefs'];

// RegExp patterns for prefix matching
StorageSync.config.syncKeys = [/^chat_/, /^user_/];
// Matches: chat_sessionId, chat_username, user_id, user_email

// RegExp patterns for suffix matching
StorageSync.config.syncKeys = [/Session$/, /Data$/];
// Matches: chatSession, userSession, appData, formData

// Mix exact strings and RegExp patterns
StorageSync.config.syncKeys = [
  'theme',           // Exact match for 'theme'
  /^session_/,      // Any key starting with 'session_'
  /Config$/         // Any key ending with 'Config'
];

// Complex patterns
StorageSync.config.syncKeys = [
  /^(chat|user)_/,  // Keys starting with 'chat_' or 'user_'
  /_(id|token)$/    // Keys ending with '_id' or '_token'
];

StorageSync.reinitialize();
```

**Use Cases**:
- 📦 **Namespace-based sync**: Sync all keys with a specific prefix (e.g., `app_*`)
- 🎨 **Feature-based sync**: Sync keys from specific features (e.g., `chat_*`, `cart_*`)
- 🔐 **Type-based sync**: Sync keys by type suffix (e.g., `*_config`, `*_state`)

## 💡 Usage Examples

### E-commerce Site

```javascript
// Sync user session and preferences across subdomains
StorageSync.config.syncKeys = ['sessionId', 'cart', 'preferences'];
StorageSync.config.overwriteExisting = false; // Preserve local cart changes
StorageSync.reinitialize();

// On shop.example.com
localStorage.setItem('cart', JSON.stringify([{id: 1, qty: 2}]));

// On checkout.example.com - cart is automatically available
const cart = JSON.parse(localStorage.getItem('cart') || '[]');
```

### Multi-App Dashboard

```javascript
// Sync both storage types for different use cases
StorageSync.config.storageType = 'both';
StorageSync.config.syncKeys = ['userId', 'theme', 'activeApp'];
StorageSync.reinitialize();

// Persistent settings in localStorage
localStorage.setItem('theme', 'dark');
localStorage.setItem('userId', '12345');

// Temporary state in sessionStorage
sessionStorage.setItem('activeApp', 'analytics');
```

### Development Environment

```javascript
// Enable debugging for development
StorageSync.config.debug = true;
StorageSync.config.overwriteExisting = true; // Always use latest data
StorageSync.reinitialize();

localStorage.setItem('debugMode', 'true');
// Console: [Storage Sync] Wrote to cookie: debugMode on domain .test.local
```

## 🔧 Manual API

For advanced use cases, the library exposes manual methods:

```javascript
// Check if library initialized successfully
if (StorageSync.isInitialized()) {
  console.log('Storage sync is ready');
}

// Check browser support
if (StorageSync.isSupported()) {
  console.log('Browser supports storage sync');
}

// Manually write to cookie
StorageSync.writeToCookie('customKey', 'customValue');

// Manually read from cookie
const value = StorageSync.readFromCookie('customKey');

// Manually delete cookie
StorageSync.deleteFromCookie('customKey');

// Get all sync cookies
const allCookies = StorageSync.getAllSyncCookies();

// Clear all sync cookies
const clearedCount = StorageSync.clearAllSyncCookies();
console.log(`Cleared ${clearedCount} cookies`);

// Manually trigger sync from cookies to storage
StorageSync.syncCookiesToStorage();

// Get library version
console.log(StorageSync.version); // "2.0.0"
```

## 🎬 Waiting for Sync Completion

The library provides two ways to wait for the initial sync to complete before initializing your application:

### Option 1: Using the `ready()` Promise (Recommended)

```javascript
// Async/await pattern
async function initApp() {
  console.log('Waiting for storage sync...');
  
  const syncDetails = await StorageSync.ready();
  console.log('Sync complete!', syncDetails);
  // {
  //   syncedCount: 3,
  //   syncedKeys: ['sessionId', 'theme', 'userId'],
  //   skippedKeys: ['localOnlyKey'],
  //   totalCookies: 4
  // }
  
  // Now safe to initialize your app
  initMyApp();
}

initApp();
```

```javascript
// Promise pattern
StorageSync.ready()
  .then(details => {
    console.log(`Synced ${details.syncedCount} items`);
    initMyApp();
  })
  .catch(error => {
    console.error('Sync failed:', error);
    // Initialize anyway or handle error
  });
```

### Option 2: Using the `storagesynccomplete` Event

```javascript
window.addEventListener('storagesynccomplete', (event) => {
  console.log('Storage sync complete!', event.detail);
  // event.detail contains:
  // {
  //   syncedCount: number,
  //   syncedKeys: string[],
  //   skippedKeys: string[],
  //   totalCookies: number
  // }
  
  initMyApp();
});
```

### Use Case: Chat Widget Example

```javascript
// Configure to sync sessionStorage for chat widget
StorageSync.config.storageType = 'sessionStorage';
StorageSync.config.syncKeys = ['chatSessionId', 'chatUsername'];
StorageSync.reinitialize();

// Wait for sync before initializing chat
async function initChatWidget() {
  await StorageSync.ready();
  
  // Check if session was restored from another subdomain
  const sessionId = sessionStorage.getItem('chatSessionId');
  if (sessionId) {
    console.log('Chat session restored from cookies!');
  } else {
    // Create new session
    const newSessionId = 'chat_' + Date.now();
    sessionStorage.setItem('chatSessionId', newSessionId);
  }
  
  renderChatWidget();
}

initChatWidget();
```

**Why wait for sync completion?**
- Ensures all synced data is available before your app initializes
- Prevents race conditions between sync and app initialization
- Provides visibility into what was synced (useful for debugging)
- Critical for widgets/apps that depend on synced session data

## 🔒 Security Considerations

### Cookie Security

Cookies are set with secure attributes:
- `domain=.example.com` - Shared across subdomains
- `path=/` - Accessible on all paths
- `SameSite=Lax` - CSRF protection
- `max-age` - Automatic expiration

### Data Safety

⚠️ **Important**: Only sync non-sensitive data. Cookies are:
- Sent with HTTP requests
- Accessible to all subdomains
- Limited to ~4KB per cookie

**Safe to sync**:
- ✅ User preferences (theme, language)
- ✅ UI state (collapsed menus, selected tabs)
- ✅ Session IDs (with proper session security)
- ✅ Anonymous analytics IDs

**NOT safe to sync**:
- ❌ Passwords or authentication tokens
- ❌ Personal information (email, phone, address)
- ❌ Credit card information
- ❌ API keys

### HTTPS Recommendation

For production use, ensure your site uses HTTPS. Add the `Secure` flag if needed:

```javascript
// Modify the writeToCookie function for HTTPS-only cookies
// (This would require forking the library)
```

## 🌐 Browser Compatibility

- **Modern browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **IE11+** (with ES6 transpilation if needed)
- **Mobile**: iOS Safari, Chrome Android

Required features:
- `localStorage` and/or `sessionStorage`
- `addEventListener`
- Basic ES6 features

## 🐛 Debugging

### Enable Debug Mode

```javascript
StorageSync.config.debug = true;
StorageSync.reinitialize();
```

### Debug Output

```
[Storage Sync] Initializing cross-subdomain storage sync
[Storage Sync] Parent domain: .example.com
[Storage Sync] Storage type: both
[Storage Sync] Overwrite existing: false
[Storage Sync] Synced from cookie to localStorage: theme
[Storage Sync] Wrote to cookie: newKey on domain .example.com
```

### Common Issues

**Data not syncing?**
1. Check browser console for errors
2. Verify cookies are enabled
3. Ensure you're on actual subdomains (not `localhost`)
4. Check `StorageSync.isInitialized()` and `StorageSync.isSupported()`

**Testing locally:**
```bash
# Add to /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1  app.test
127.0.0.1  admin.test
```

**Cookie size errors:**
- Each cookie limited to ~4KB
- Use `syncKeys` to limit what gets synced
- Keep values small

## 📊 Performance

- **Initialization**: ~1-2ms
- **Memory**: Negligible overhead
- **Network**: No additional requests (uses existing cookie headers)
- **Storage**: ~50 bytes overhead per synced key

## 🧪 Testing

### Manual Testing

1. Open `test.html` in your browser
2. Set up local subdomains in `/etc/hosts`
3. Test sync between `app.test` and `admin.test`

### Automated Testing

We welcome contributions for automated test suites!

## � Publishing (Maintainers Only)

If you're a maintainer and need to publish a new version:

### Prerequisites

```bash
# Ensure you have publishing rights
npm login

# Ensure all dependencies are installed
npm install
```

### Publishing Steps

1. **Update Version**
   ```bash
   # Update version in package.json (following semver)
   npm version patch  # For bug fixes: 2.0.0 -> 2.0.1
   npm version minor  # For new features: 2.0.0 -> 2.1.0
   npm version major  # For breaking changes: 2.0.0 -> 3.0.0
   ```

2. **Update Changelog**
   - Edit README.md
   - Add release notes under `## 📝 Changelog`
   - Describe what changed in this version

3. **Build and Test**
   ```bash
   # Run linter
   npm run lint
   
   # Build distribution files
   npm run build
   
   # Test manually if needed
   # Open test.html and example-chat-widget.html in browsers
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Release v2.1.0"
   git push origin main
   ```

5. **Create Git Tag**
   ```bash
   git tag v2.1.0
   git push --tags
   ```

6. **Publish to NPM**
   ```bash
   npm publish
   ```

7. **Create GitHub Release**
   - Go to GitHub repository
   - Click "Releases" → "Draft a new release"
   - Select the tag you just created
   - Add release notes from changelog
   - Publish release

### Quick Publish Command

For patch releases (bug fixes only):
```bash
npm version patch && npm run build && git push && git push --tags && npm publish
```

## �📝 Changelog

### 2.0.0 (Latest)
- ✨ Added sessionStorage support
- ✨ Added configurable overwrite behavior
- ✨ Enhanced error handling and input validation
- ✨ Added TypeScript definitions
- ✨ Improved debug logging
- ✨ Added initialization status checking
- 🐛 Fixed cookie size validation
- 📚 Comprehensive documentation update

### 1.0.0
- Initial release with localStorage sync

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/yourusername/cross-domain-storage-sync.git
cd cross-domain-storage-sync
npm install
npm run build
```

## 📄 License

[MIT](LICENSE) © Cross-Domain Storage Sync Contributors

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/cross-domain-storage-sync/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/cross-domain-storage-sync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cross-domain-storage-sync/discussions)

---

If this library helps you, please ⭐ **star it on GitHub**!

**Made with ❤️ for developers who need seamless cross-subdomain storage**
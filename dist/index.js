/**
 * Cross-Subdomain Storage Sync Middleware
 *
 * Syncs localStorage and/or sessionStorage across subdomains using cookies on the parent domain.
 * This allows data stored in storage on one subdomain (e.g., app.example.com)
 * to be accessible on another subdomain (e.g., admin.example.com).
 *
 * Features:
 * - Support for localStorage, sessionStorage, or both
 * - Configurable overwrite behavior for existing keys
 * - Automatic bi-directional sync
 * - Configurable sync keys
 * - Debug mode and comprehensive error handling
 *
 * @version 2.0.0
 * @license MIT
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    /**
     * Prefix for sync cookies to avoid naming conflicts
     * @type {string}
     */
    cookiePrefix: "sds_sync_",

    /**
     * Cookie expiration time in seconds (default: 1 year)
     * @type {number}
     */
    cookieMaxAge: 365 * 24 * 60 * 60,

    /**
     * Array of localStorage keys to sync across subdomains
     * Empty array = sync all keys
     * Supports exact strings: ['sessionId', 'userPrefs']
     * Supports RegExp patterns: [/^chat_/, /session$/]
     * Can mix both: ['exactKey', /^prefix_/]
     * @type {Array<string|RegExp>}
     */
    syncKeys: [],

    /**
     * Whether to overwrite existing keys when syncing from cookies
     * false (default): Only sync keys that don't exist locally (safer)
     * true: Overwrite existing local keys with cookie values
     * @type {boolean}
     */
    overwriteExisting: false,

    /**
     * Storage types to sync. Options: 'localStorage', 'sessionStorage', or 'both'
     * 'localStorage' (default): Only sync localStorage
     * 'sessionStorage': Only sync sessionStorage  
     * 'both': Sync both localStorage and sessionStorage
     * @type {string}
     */
    storageType: "localStorage",

    /**
     * Enable debug logging to console
     * Set to false in production to reduce console noise
     * @type {boolean}
     */
    debug: false,
  };

  /**
   * Log message to console if debug mode is enabled
   * @param {...any} args - Arguments to log
   * @private
   */
  function log(...args) {
    if (CONFIG.debug) {
      try {
        console.log("[Storage Sync]", ...args);
      } catch (e) {
        // Silently fail if console is not available
      }
    }
  }

  /**
   * Log error to console (always shown, regardless of debug mode)
   * @param {...any} args - Arguments to log
   * @private
   */
  function logError(...args) {
    try {
      console.error("[Storage Sync]", ...args);
    } catch (e) {
      // Silently fail if console is not available
    }
  }

  /**
   * Log warning to console if debug mode is enabled
   * @param {...any} args - Arguments to log
   * @private
   */
  function logWarn(...args) {
    if (CONFIG.debug) {
      try {
        console.warn("[Storage Sync]", ...args);
      } catch (e) {
        // Silently fail if console is not available
      }
    }
  }

  /**
   * Check if the current environment supports the required features
   * @returns {boolean} True if environment is supported
   * @private
   */
  function isEnvironmentSupported() {
    try {
      // Check for localStorage support
      if (typeof Storage === "undefined") {
        logError("Storage is not supported in this environment");
        return false;
      }

      // Check for localStorage availability
      if (typeof localStorage === "undefined") {
        logError("localStorage is not available");
        return false;
      }

      // Check for sessionStorage availability if needed
      if ((CONFIG.storageType === "sessionStorage" || CONFIG.storageType === "both") && 
          typeof sessionStorage === "undefined") {
        logError("sessionStorage is not available but is required by configuration");
        return false;
      }

      // Check for document.cookie support
      if (typeof document === "undefined" || typeof document.cookie === "undefined") {
        logError("Cookies are not supported in this environment");
        return false;
      }

      // Test storage write capability
      try {
        const testKey = "__storage_sync_test__";
        localStorage.setItem(testKey, "test");
        localStorage.removeItem(testKey);
      } catch (e) {
        logError("localStorage is not writable:", e.message);
        return false;
      }

      return true;
    } catch (error) {
      logError("Environment check failed:", error);
      return false;
    }
  }

  /**
   * Sanitize key to prevent cookie injection and other security issues
   * @param {string} key - The key to sanitize
   * @returns {string|null} Sanitized key or null if invalid
   * @private
   */
  function sanitizeKey(key) {
    if (typeof key !== "string") {
      logWarn("Key must be a string, got:", typeof key);
      return null;
    }

    if (key.length === 0) {
      logWarn("Key cannot be empty");
      return null;
    }

    if (key.length > 200) {
      logWarn("Key is too long (max 200 characters):", key.length);
      return null;
    }

    // Remove potentially dangerous characters
    const sanitized = key.replace(/[;,\s=]/g, "_");
    
    if (sanitized !== key) {
      logWarn(`Key was sanitized from "${key}" to "${sanitized}"`);
    }

    return sanitized;
  }

  /**
   * Sanitize value to prevent issues with cookie storage
   * @param {string} value - The value to sanitize
   * @returns {string|null} Sanitized value or null if invalid
   * @private
   */
  function sanitizeValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value !== "string") {
      // Convert to string but warn about it
      logWarn("Value was converted to string from:", typeof value);
      value = String(value);
    }

    // Check size (cookies have ~4KB limit, leave room for other cookie data)
    const maxSize = 3500; // Conservative limit
    if (value.length > maxSize) {
      logError(`Value is too large for cookie storage (${value.length} chars, max ${maxSize})`);
      return null;
    }

    return value;
  }

  /**
   * Get the parent domain for cookie sharing
   *
   * This function determines the appropriate domain for setting cookies
   * that will be shared across all subdomains.
   *
   * Examples:
   * - 'app.example.com' -> '.example.com'
   * - 'admin.example.com' -> '.example.com'
   * - 'localhost' -> 'localhost'
   * - '192.168.1.1' -> '192.168.1.1'
   *
   * @returns {string} Parent domain with leading dot for subdomain sharing
   * @private
   */
  function getParentDomain() {
    const hostname = window.location.hostname;

    // If localhost or IP address, return as-is (no subdomain sharing possible)
    if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname;
    }

    // Extract parent domain (e.g., 'sub.example.com' -> '.example.com')
    // The leading dot allows the cookie to be shared across all subdomains
    const parts = hostname.split(".");
    if (parts.length > 2) {
      return `.${  parts.slice(-2).join(".")}`;
    }
    return `.${  hostname}`;
  }

  /**
   * Get storage objects based on configuration
   * @returns {Storage[]} Array of storage objects to sync
   * @private
   */
  function getStorageObjects() {
    const storages = [];
    
    if (CONFIG.storageType === "localStorage" || CONFIG.storageType === "both") {
      storages.push(localStorage);
    }
    
    if (CONFIG.storageType === "sessionStorage" || CONFIG.storageType === "both") {
      storages.push(sessionStorage);
    }
    
    return storages;
  }

  /**
   * Get storage name for logging purposes
   * @param {Storage} storage - The storage object
   * @returns {string} Human-readable storage name
   * @private
   */
  function getStorageName(storage) {
    return storage === localStorage ? "localStorage" : "sessionStorage";
  }

  /**
   * Validate configuration options
   * @returns {boolean} True if configuration is valid
   * @private
   */
  function validateConfig() {
    let isValid = true;

    // Validate storageType
    const validStorageTypes = ["localStorage", "sessionStorage", "both"];
    if (!validStorageTypes.includes(CONFIG.storageType)) {
      logError(`Invalid storageType: ${CONFIG.storageType}. Must be one of: ${validStorageTypes.join(", ")}`);
      CONFIG.storageType = "localStorage"; // Fallback to default
      isValid = false;
    }
    
    // Validate overwriteExisting
    if (typeof CONFIG.overwriteExisting !== "boolean") {
      logError("overwriteExisting must be a boolean, got:", typeof CONFIG.overwriteExisting);
      CONFIG.overwriteExisting = false; // Fallback to default
      isValid = false;
    }

    // Validate debug
    if (typeof CONFIG.debug !== "boolean") {
      logError("debug must be a boolean, got:", typeof CONFIG.debug);
      CONFIG.debug = false; // Fallback to default
      isValid = false;
    }

    // Validate cookiePrefix
    if (typeof CONFIG.cookiePrefix !== "string" || CONFIG.cookiePrefix.length === 0) {
      logError("cookiePrefix must be a non-empty string");
      CONFIG.cookiePrefix = "ls_sync_"; // Fallback to default
      isValid = false;
    }

    // Validate cookieMaxAge
    if (typeof CONFIG.cookieMaxAge !== "number" || CONFIG.cookieMaxAge <= 0) {
      logError("cookieMaxAge must be a positive number");
      CONFIG.cookieMaxAge = 365 * 24 * 60 * 60; // Fallback to default
      isValid = false;
    }

    // Validate syncKeys
    if (!Array.isArray(CONFIG.syncKeys)) {
      logError("syncKeys must be an array");
      CONFIG.syncKeys = []; // Fallback to default
      isValid = false;
    } else {
      // Validate each key in syncKeys (can be string or RegExp)
      CONFIG.syncKeys = CONFIG.syncKeys.filter((key) => {
        if (typeof key !== "string" && !(key instanceof RegExp)) {
          logError("syncKeys must contain only strings or RegExp patterns, found:", typeof key);
          return false;
        }
        if (typeof key === "string" && key.length === 0) {
          logError("syncKeys cannot contain empty strings");
          return false;
        }
        return true;
      });
    }

    return isValid;
  }

  /**
   * Check if a localStorage key should be synced across subdomains
   *
   * Supports exact string matches and RegExp patterns.
   *
   * @param {string} key - The localStorage key to check
   * @returns {boolean} True if the key should be synced
   * @private
   */
  function shouldSync(key) {
    if (!key) {return false;}

    // If syncKeys is empty, sync all keys
    if (CONFIG.syncKeys.length === 0) {return true;}

    // Check if key matches any pattern in syncKeys
    return CONFIG.syncKeys.some((pattern) => {
      if (typeof pattern === "string") {
        // Exact string match
        return pattern === key;
      } else if (pattern instanceof RegExp) {
        // RegExp pattern match
        return pattern.test(key);
      }
      return false;
    });
  }

  /**
   * Write a value to a cookie on the parent domain
   *
   * This creates a cookie that is accessible across all subdomains
   * of the parent domain.
   *
   * @param {string} key - The storage key (cookie name will be prefixed)
   * @param {string} value - The value to store
   * @returns {boolean} True if cookie was written successfully
   * @public
   */
  function writeToCookie(key, value) {
    try {
      const sanitizedKey = sanitizeKey(key);
      if (!sanitizedKey) {
        logError("writeToCookie: invalid key provided");
        return false;
      }

      const sanitizedValue = sanitizeValue(value);
      if (sanitizedValue === null) {
        logError("writeToCookie: invalid value provided");
        return false;
      }

      const cookieName = CONFIG.cookiePrefix + sanitizedKey;
      const domain = getParentDomain();
      const maxAge = CONFIG.cookieMaxAge;

      // URL encode the value to handle special characters and prevent cookie injection
      const encodedValue = encodeURIComponent(sanitizedValue);

      // Set cookie with parent domain and SameSite=Lax for security
      document.cookie = `${cookieName}=${encodedValue}; max-age=${maxAge}; domain=${domain}; path=/; SameSite=Lax`;

      log(`Wrote to cookie: ${sanitizedKey} on domain ${domain}`);
      return true;
    } catch (error) {
      logError(`Failed to write cookie for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Delete a cookie from the parent domain
   *
   * @param {string} key - The storage key (cookie name will be prefixed)
   * @returns {boolean} True if deletion was attempted successfully
   * @public
   */
  function deleteFromCookie(key) {
    try {
      const sanitizedKey = sanitizeKey(key);
      if (!sanitizedKey) {
        logError("deleteFromCookie: invalid key provided");
        return false;
      }

      const cookieName = CONFIG.cookiePrefix + sanitizedKey;
      const domain = getParentDomain();

      // Set max-age=0 to delete the cookie
      document.cookie = `${cookieName}=; max-age=0; domain=${domain}; path=/; SameSite=Lax`;

      log(`Deleted cookie: ${sanitizedKey} from domain ${domain}`);
      return true;
    } catch (error) {
      logError(`Failed to delete cookie for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Read a value from a cookie
   *
   * @param {string} key - The storage key (cookie name will be prefixed)
   * @returns {string|null} The cookie value or null if not found or error occurred
   * @public
   */
  function readFromCookie(key) {
    try {
      const sanitizedKey = sanitizeKey(key);
      if (!sanitizedKey) {
        logError("readFromCookie: invalid key provided");
        return null;
      }

      const cookieName = CONFIG.cookiePrefix + sanitizedKey;
      
      if (!document.cookie) {
        return null; // No cookies available
      }

      const cookies = document.cookie.split(";");

      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf("=");

        if (equalIndex === -1) {continue;}

        const name = trimmed.substring(0, equalIndex);
        const value = trimmed.substring(equalIndex + 1);

        if (name === cookieName) {
          try {
            return decodeURIComponent(value);
          } catch (decodeError) {
            logError(`Failed to decode cookie value for key "${key}":`, decodeError);
            return null;
          }
        }
      }

      return null; // Cookie not found
    } catch (error) {
      logError(`Failed to read cookie for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Get all sync cookies
   *
   * Retrieves all cookies that were created by this sync middleware
   * (identified by the cookie prefix).
   *
   * @returns {Object} Object with key-value pairs from sync cookies
   * @public
   */
  function getAllSyncCookies() {
    const cookies = document.cookie.split(";");
    const syncData = {};

    try {
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf("=");

        if (equalIndex === -1) {continue;}

        const name = trimmed.substring(0, equalIndex);
        const value = trimmed.substring(equalIndex + 1);

        if (name && name.startsWith(CONFIG.cookiePrefix)) {
          const key = name.substring(CONFIG.cookiePrefix.length);
          syncData[key] = decodeURIComponent(value || "");
        }
      }
    } catch (error) {
      logError("Failed to get sync cookies:", error);
    }

    return syncData;
  }

  /**
   * Clear all sync cookies
   *
   * Deletes all cookies that were created by this sync middleware
   * (identified by the cookie prefix).
   *
   * @returns {number} Number of cookies cleared
   * @public
   */
  function clearAllSyncCookies() {
    try {
      const cookies = getAllSyncCookies();
      let count = 0;
      
      for (const key in cookies) {
        if (Object.prototype.hasOwnProperty.call(cookies, key)) {
          if (deleteFromCookie(key)) {
            count++;
          }
        }
      }
      
      log(`Cleared ${count} sync cookies`);
      return count;
    } catch (error) {
      logError("Failed to clear sync cookies:", error);
      return 0;
    }
  }

  /**
   * Sync cookies to storage on page load
   *
   * This function reads all sync cookies and writes them to the configured
   * storage type(s). Behavior depends on CONFIG.overwriteExisting:
   * - false: Only sync keys that don't exist locally (safer, default)
   * - true: Overwrite existing local keys with cookie values
   *
   * IMPORTANT: Uses original Storage methods to avoid triggering cookie writes
   *
   * @public
   * @fires storagesynccomplete - Dispatched when sync is complete
   */
  function syncCookiesToStorage() {
    log("Syncing cookies to storage...");

    const syncData = getAllSyncCookies();
    const storages = getStorageObjects();
    let totalSyncCount = 0;
    const syncedKeys = [];
    const skippedKeys = [];

    for (const storage of storages) {
      const storageName = getStorageName(storage);
      let syncCount = 0;

      for (const [key, value] of Object.entries(syncData)) {
        // Skip if key should not be synced
        if (!shouldSync(key)) {
          continue;
        }

        const existingValue = storage.getItem(key);
        const shouldWrite = CONFIG.overwriteExisting || existingValue === null;
        
        if (shouldWrite && value) {
          try {
            // Use the ORIGINAL setItem to avoid triggering cookie write during sync
            // This prevents infinite loops and duplicate cookie writes
            originalSetItem.call(storage, key, value);
            syncCount++;
            syncedKeys.push({ key, storageType: storageName, overwritten: existingValue !== null });
            log(`Synced from cookie to ${storageName}: ${key}${CONFIG.overwriteExisting && existingValue !== null ? " (overwritten)" : ""}`);
          } catch (error) {
            // Common errors: QuotaExceededError, SecurityError
            logError(`Error syncing "${key}" to ${storageName}:`, error);
          }
        } else if (existingValue !== null && !CONFIG.overwriteExisting) {
          skippedKeys.push({ key, storageType: storageName, reason: "exists" });
          log(`Skipped syncing "${key}" to ${storageName}: key exists and overwriteExisting is false`);
        }
      }

      log(`Synced ${syncCount} items from cookies to ${storageName}`);
      totalSyncCount += syncCount;
    }

    log(`Total synced: ${totalSyncCount} items across all storage types`);

    // Dispatch sync complete event
    dispatchSyncCompleteEvent({
      syncedCount: totalSyncCount,
      syncedKeys: syncedKeys,
      skippedKeys: skippedKeys,
      totalCookies: Object.keys(syncData).length,
    });
  }

  /**
   * Dispatch a custom event when sync is complete
   * @param {Object} detail - Event detail data
   * @private
   */
  function dispatchSyncCompleteEvent(detail) {
    try {
      const event = new CustomEvent("storagesynccomplete", {
        detail: detail,
        bubbles: true,
        cancelable: false,
      });
      window.dispatchEvent(event);
      log("Dispatched storagesynccomplete event");
    } catch (error) {
      logError("Failed to dispatch sync complete event:", error);
    }
  }

  /**
   * Listen for storage changes from other tabs/windows
   *
   * The storage event fires when localStorage or sessionStorage is modified in another
   * browser tab or window on the same origin. This allows us to keep
   * cookies in sync when users have multiple tabs open.
   *
   * Note: This event does NOT fire for changes made in the current tab.
   * See setupLocalChangeDetection() for handling same-window changes.
   *
   * @private
   */
  function setupStorageListener() {
    window.addEventListener("storage", (event) => {
      log("Storage event detected");
      log("  Key:", event.key);
      log("  Old value:", event.oldValue);
      log("  New value:", event.newValue);
      log("  Storage area:", event.storageArea === localStorage ? "localStorage" : "sessionStorage");

      // Only sync if the storage type is configured for syncing
      const isLocalStorage = event.storageArea === localStorage;
      const isSessionStorage = event.storageArea === sessionStorage;
      const shouldSyncThisStorage = 
        (isLocalStorage && (CONFIG.storageType === "localStorage" || CONFIG.storageType === "both")) ||
        (isSessionStorage && (CONFIG.storageType === "sessionStorage" || CONFIG.storageType === "both"));

      if (!shouldSyncThisStorage) {
        log("Storage change ignored: storage type not configured for syncing");
        return;
      }

      // Handle the storage change
      if (event.key && shouldSync(event.key)) {
        if (event.newValue === null) {
          // Key was removed from storage
          deleteFromCookie(event.key);
        } else {
          // Key was added or updated in storage
          writeToCookie(event.key, event.newValue);
        }
      } else if (event.key === null) {
        // Storage.clear() was called
        const storageName = isLocalStorage ? "localStorage" : "sessionStorage";
        log(`${storageName} was cleared`);
        // Note: We don't automatically clear cookies here to prevent
        // accidental data loss across subdomains. If needed, cookies
        // will be cleared individually as they're removed from storage.
      }
    });
  }

  /**
   * Monitor storage changes in the same window/tab
   *
   * The storage event doesn't fire in the same window that made the change,
   * so we need to override the Storage prototype methods to detect changes
   * made in the current tab and sync them to cookies.
   *
   * This is safe because we only override methods for our sync logic and
   * call the original methods to preserve normal storage behavior.
   *
   * @private
   */
  function setupLocalChangeDetection() {
    // IMPORTANT: These references are captured BEFORE we modify the prototypes
    // This allows syncCookiesToStorage to use the original methods
    // and prevents infinite loops
    
    /**
     * Check if a storage object should be synced based on configuration
     * @param {Storage} storage - The storage object to check
     * @returns {boolean} True if this storage type should be synced
     */
    function shouldSyncStorage(storage) {
      const isLocalStorage = storage === localStorage;
      const isSessionStorage = storage === sessionStorage;
      
      return (isLocalStorage && (CONFIG.storageType === "localStorage" || CONFIG.storageType === "both")) ||
             (isSessionStorage && (CONFIG.storageType === "sessionStorage" || CONFIG.storageType === "both"));
    }

    /**
     * Override setItem to sync to cookies
     */
    Storage.prototype.setItem = function (key, value) {
      try {
        // Call original method first
        originalSetItem.call(this, key, value);

        // Only sync if this storage type is configured for syncing and key should be synced
        if (shouldSyncStorage(this) && shouldSync(key)) {
          writeToCookie(key, value);
        }
      } catch (error) {
        // Re-throw the error after logging it
        logError(`Error in setItem for key "${key}":`, error);
        throw error;
      }
    };

    /**
     * Override removeItem to remove from cookies
     */
    Storage.prototype.removeItem = function (key) {
      try {
        // Call original method first
        originalRemoveItem.call(this, key);

        // Only sync if this storage type is configured for syncing and key should be synced
        if (shouldSyncStorage(this) && shouldSync(key)) {
          deleteFromCookie(key);
        }
      } catch (error) {
        logError(`Error in removeItem for key "${key}":`, error);
        throw error;
      }
    };

    /**
     * Override clear to remove all synced cookies
     */
    Storage.prototype.clear = function () {
      try {
        if (shouldSyncStorage(this)) {
          // Get all keys before clearing
          const keys = Object.keys(this);

          // Call original method
          originalClear.call(this);

          // Remove corresponding cookies for synced keys
          keys.forEach((key) => {
            if (shouldSync(key)) {
              deleteFromCookie(key);
            }
          });
        } else {
          // Not a synced storage type, just call original
          originalClear.call(this);
        }
      } catch (error) {
        logError("Error in clear:", error);
        throw error;
      }
    };
  }

  // Store original Storage methods BEFORE any modifications
  // This must be done at module load time, not in setupLocalChangeDetection
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  /**
   * Initialize the sync middleware
   *
   * This function sets up the entire sync system:
   * 1. Checks environment support
   * 2. Validates configuration
   * 3. Syncs existing cookies to storage (for first load on a new subdomain)
   * 4. Sets up cross-tab storage listeners
   * 5. Overrides storage methods to detect same-tab changes
   *
   * @returns {boolean} True if initialization was successful
   * @private
   */
  function init() {
    try {
      log("Initializing cross-subdomain storage sync");

      // Check environment support first
      if (!isEnvironmentSupported()) {
        logError("Environment not supported, initialization aborted");
        return false;
      }

      log("Parent domain:", getParentDomain());
      log("Storage type:", CONFIG.storageType);
      log("Overwrite existing:", CONFIG.overwriteExisting);
      log("Debug mode:", CONFIG.debug);

      // Validate configuration
      const configValid = validateConfig();
      if (!configValid) {
        logWarn("Configuration had issues but was corrected with fallback values");
      }

      // First, sync cookies to storage IMMEDIATELY (before any widgets load)
      // This is crucial for apps that read from storage on init
      syncCookiesToStorage();

      // Then set up listeners for future changes
      setupStorageListener();
      setupLocalChangeDetection();

      log("Initialization complete");
      return true;
    } catch (error) {
      logError("Failed to initialize:", error);
      return false;
    }
  }

  // Initialize IMMEDIATELY - don't wait for DOM ready
  // This ensures cookies are synced to storage before other scripts run
  const initSuccess = init();

  // Expose initialization status
  let isInitialized = initSuccess;

  // Promise that resolves when initial sync is complete
  let syncCompleteResolve;
  const syncCompletePromise = new Promise((resolve) => {
    syncCompleteResolve = resolve;
  });

  // Listen for our own sync complete event to resolve the promise
  window.addEventListener("storagesynccomplete", (event) => {
    if (syncCompleteResolve) {
      syncCompleteResolve(event.detail);
      syncCompleteResolve = null; // Only resolve once
    }
  });

  /**
   * Public API
   * Exposed as window.StorageSync for manual operations and configuration
   *
   * @namespace StorageSync
   * @global
   */
  window.StorageSync = {
    /**
     * Write a value to a sync cookie
     * @function
     * @param {string} key - The storage key
     * @param {string} value - The value to store
     * @returns {boolean} True if successful
     */
    writeToCookie,

    /**
     * Read a value from a sync cookie
     * @function
     * @param {string} key - The storage key
     * @returns {string|null} The cookie value or null
     */
    readFromCookie,

    /**
     * Delete a sync cookie
     * @function
     * @param {string} key - The storage key
     * @returns {boolean} True if successful
     */
    deleteFromCookie,

    /**
     * Manually trigger sync from cookies to storage
     * @function
     */
    syncCookiesToStorage,

    /**
     * @deprecated Use syncCookiesToStorage instead
     * Manually trigger sync from cookies to localStorage (backward compatibility)
     * @function
     */
    syncCookiesToLocalStorage: syncCookiesToStorage,

    /**
     * Get all sync cookies as an object
     * @function
     * @returns {Object} Key-value pairs from sync cookies
     */
    getAllSyncCookies,

    /**
     * Clear all sync cookies
     * @function
     * @returns {number} Number of cookies cleared
     */
    clearAllSyncCookies,

    /**
     * Check if the library was initialized successfully
     * @function
     * @returns {boolean} True if initialized successfully
     */
    isInitialized: () => isInitialized,

    /**
     * Check if the current environment is supported
     * @function
     * @returns {boolean} True if environment is supported
     */
    isSupported: isEnvironmentSupported,

    /**
     * Reinitialize the sync system (useful after configuration changes)
     * @function
     * @returns {boolean} True if reinitialization was successful
     */
    reinitialize: () => {
      try {
        isInitialized = init();
        return isInitialized;
      } catch (error) {
        logError("Reinitialization failed:", error);
        return false;
      }
    },

    /**
     * Wait for initial sync to complete
     * Returns a promise that resolves when the initial cookie-to-storage sync is done
     * @function
     * @returns {Promise<Object>} Promise that resolves with sync details
     * @example
     * await StorageSync.ready();
     * // Now safe to initialize widgets that depend on synced data
     */
    ready: () => syncCompletePromise,

    /**
     * Configuration object
     * Modify before initialization to customize behavior
     * @type {Object}
     */
    config: CONFIG,

    /**
     * Version of the library
     * @type {string}
     */
    version: "2.0.0",
  };
})();

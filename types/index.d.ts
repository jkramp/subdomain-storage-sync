// Type definitions for subdomain-storage-sync v2.0.0
// Project: https://github.com/yourusername/subdomain-storage-sync
// Definitions by: Subdomain Storage Sync Contributors
// TypeScript Version: 3.0

declare global {
  interface Window {
    StorageSync: StorageSyncAPI;
  }

  /**
   * Extend WindowEventMap to include storage sync events
   */
  interface WindowEventMap {
    'storagesynccomplete': StorageSyncCompleteEvent;
  }
}

/**
 * Storage type options for syncing
 */
export type StorageType = 'localStorage' | 'sessionStorage' | 'both';

/**
 * Sync complete event detail
 */
export interface SyncCompleteDetail {
  /**
   * Total number of items synced
   */
  syncedCount: number;

  /**
   * Array of synced keys with details
   */
  syncedKeys: Array<{
    key: string;
    storageType: 'localStorage' | 'sessionStorage';
    overwritten: boolean;
  }>;

  /**
   * Array of skipped keys with reasons
   */
  skippedKeys: Array<{
    key: string;
    storageType: 'localStorage' | 'sessionStorage';
    reason: string;
  }>;

  /**
   * Total number of cookies found
   */
  totalCookies: number;
}

/**
 * Storage sync complete event
 */
export interface StorageSyncCompleteEvent extends CustomEvent<SyncCompleteDetail> {
  type: 'storagesynccomplete';
}

/**
 * Configuration object for StorageSync
 */
export interface StorageSyncConfig {
  /**
   * Storage type to sync: 'localStorage', 'sessionStorage', or 'both'
   * @default 'localStorage'
   */
  storageType: StorageType;

  /**
   * Whether to overwrite existing keys when syncing from cookies
   * false: Only sync keys that don't exist locally (safer)
   * true: Overwrite existing local keys with cookie values
   * @default false
   */
  overwriteExisting: boolean;

  /**
   * Prefix for sync cookies to avoid naming conflicts
   * @default 'sds_sync_'
   */
  cookiePrefix: string;

  /**
   * Cookie expiration time in seconds
   * @default 31536000 (1 year)
   */
  cookieMaxAge: number;

  /**
   * Array of storage keys to sync across subdomains
   * Empty array = sync all keys
   * Supports exact strings: ['sessionId', 'userPrefs']
   * Supports RegExp patterns: [/^chat_/, /session$/]
   * Can mix both: ['exactKey', /^prefix_/]
   * @default []
   */
  syncKeys: Array<string | RegExp>;

  /**
   * Enable debug logging to console
   * Set to false in production to reduce console noise
   * @default false
   */
  debug: boolean;
}

/**
 * Main StorageSync API interface
 */
export interface StorageSyncAPI {
  /**
   * Write a value to a sync cookie
   * @param key The storage key
   * @param value The value to store
   * @returns True if successful
   */
  writeToCookie(key: string, value: string): boolean;

  /**
   * Read a value from a sync cookie
   * @param key The storage key
   * @returns The cookie value or null if not found
   */
  readFromCookie(key: string): string | null;

  /**
   * Delete a sync cookie
   * @param key The storage key
   * @returns True if successful
   */
  deleteFromCookie(key: string): boolean;

  /**
   * Manually trigger sync from cookies to storage
   */
  syncCookiesToStorage(): void;

  /**
   * @deprecated Use syncCookiesToStorage instead
   * Manually trigger sync from cookies to localStorage (backward compatibility)
   */
  syncCookiesToLocalStorage(): void;

  /**
   * Get all sync cookies as an object
   * @returns Key-value pairs from sync cookies
   */
  getAllSyncCookies(): Record<string, string>;

  /**
   * Clear all sync cookies
   * @returns Number of cookies cleared
   */
  clearAllSyncCookies(): number;

  /**
   * Check if the library was initialized successfully
   * @returns True if initialized successfully
   */
  isInitialized(): boolean;

  /**
   * Check if the current environment is supported
   * @returns True if environment is supported
   */
  isSupported(): boolean;

  /**
   * Reinitialize the sync system (useful after configuration changes)
   * @returns True if reinitialization was successful
   */
  reinitialize(): boolean;

  /**
   * Wait for initial sync to complete
   * Returns a promise that resolves when the initial cookie-to-storage sync is done
   * @returns Promise that resolves with sync details
   * @example
   * await StorageSync.ready();
   * // Now safe to initialize widgets that depend on synced data
   */
  ready(): Promise<SyncCompleteDetail>;

  /**
   * Configuration object - modify to customize behavior
   */
  config: StorageSyncConfig;

  /**
   * Version of the library
   */
  readonly version: string;
}

/**
 * The global StorageSync object
 */
declare const StorageSync: StorageSyncAPI;

export default StorageSync;
export { StorageSyncAPI, StorageSyncConfig };
/**
 * Basic test suite for subdomain-storage-sync
 * 
 * To run these tests, you'll need a test runner like Jest or Mocha.
 * For now, these are example tests to get you started.
 * 
 * Setup:
 * npm install --save-dev jest
 * Add to package.json: "test": "jest"
 * Run: npm test
 */

describe('StorageSync - Basic Functionality', () => {
  beforeEach(() => {
    // Clear storage and cookies before each test
    localStorage.clear();
    sessionStorage.clear();
    if (typeof StorageSync !== 'undefined') {
      StorageSync.clearAllSyncCookies();
    }
  });

  describe('Cookie Operations', () => {
    test('should write and read cookies', () => {
      const result = StorageSync.writeToCookie('testKey', 'testValue');
      expect(result).toBe(true);
      
      const value = StorageSync.readFromCookie('testKey');
      expect(value).toBe('testValue');
    });

    test('should delete cookies', () => {
      StorageSync.writeToCookie('testKey', 'testValue');
      const deleteResult = StorageSync.deleteFromCookie('testKey');
      expect(deleteResult).toBe(true);
      
      const value = StorageSync.readFromCookie('testKey');
      expect(value).toBeNull();
    });

    test('should sanitize dangerous keys', () => {
      const result = StorageSync.writeToCookie('key;=with,bad', 'value');
      expect(result).toBe(true);
      
      // Key should be sanitized
      const value = StorageSync.readFromCookie('key;=with,bad');
      expect(value).toBe('value');
    });

    test('should handle large values', () => {
      const largeValue = 'x'.repeat(5000); // Too large for cookie
      const result = StorageSync.writeToCookie('large', largeValue);
      expect(result).toBe(false); // Should fail gracefully
    });

    test('should get all sync cookies', () => {
      StorageSync.writeToCookie('key1', 'value1');
      StorageSync.writeToCookie('key2', 'value2');
      
      const allCookies = StorageSync.getAllSyncCookies();
      expect(allCookies).toHaveProperty('key1', 'value1');
      expect(allCookies).toHaveProperty('key2', 'value2');
    });

    test('should clear all sync cookies', () => {
      StorageSync.writeToCookie('key1', 'value1');
      StorageSync.writeToCookie('key2', 'value2');
      
      const count = StorageSync.clearAllSyncCookies();
      expect(count).toBe(2);
      
      const allCookies = StorageSync.getAllSyncCookies();
      expect(Object.keys(allCookies).length).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should have default configuration', () => {
      expect(StorageSync.config.storageType).toBe('localStorage');
      expect(StorageSync.config.overwriteExisting).toBe(false);
      expect(StorageSync.config.cookiePrefix).toBe('sds_sync_');
      expect(StorageSync.config.syncKeys).toEqual([]);
    });

    test('should validate configuration', () => {
      // Invalid storageType should be corrected on reinit
      StorageSync.config.storageType = 'invalid';
      StorageSync.reinitialize();
      
      // Should fallback to default
      expect(StorageSync.config.storageType).toBe('localStorage');
    });
  });

  describe('Pattern Matching', () => {
    test('should match exact string keys', () => {
      StorageSync.config.syncKeys = ['exact1', 'exact2'];
      StorageSync.reinitialize();
      
      // These should sync
      localStorage.setItem('exact1', 'value1');
      localStorage.setItem('exact2', 'value2');
      
      // This should not sync
      localStorage.setItem('other', 'value3');
      
      const cookies = StorageSync.getAllSyncCookies();
      expect(cookies).toHaveProperty('exact1');
      expect(cookies).toHaveProperty('exact2');
      expect(cookies).not.toHaveProperty('other');
    });

    test('should match RegExp patterns', () => {
      StorageSync.config.syncKeys = [/^chat_/, /Session$/];
      StorageSync.reinitialize();
      
      // These should match
      localStorage.setItem('chat_id', 'value1');
      localStorage.setItem('chat_user', 'value2');
      localStorage.setItem('userSession', 'value3');
      
      // This should not match
      localStorage.setItem('other', 'value4');
      
      const cookies = StorageSync.getAllSyncCookies();
      expect(cookies).toHaveProperty('chat_id');
      expect(cookies).toHaveProperty('chat_user');
      expect(cookies).toHaveProperty('userSession');
      expect(cookies).not.toHaveProperty('other');
    });

    test('should mix exact strings and RegExp patterns', () => {
      StorageSync.config.syncKeys = ['exactKey', /^prefix_/];
      StorageSync.reinitialize();
      
      localStorage.setItem('exactKey', 'value1');
      localStorage.setItem('prefix_test', 'value2');
      localStorage.setItem('other', 'value3');
      
      const cookies = StorageSync.getAllSyncCookies();
      expect(cookies).toHaveProperty('exactKey');
      expect(cookies).toHaveProperty('prefix_test');
      expect(cookies).not.toHaveProperty('other');
    });
  });

  describe('Storage Type Configuration', () => {
    test('should sync localStorage only by default', () => {
      StorageSync.config.storageType = 'localStorage';
      StorageSync.config.syncKeys = []; // Sync all keys
      StorageSync.reinitialize();
      
      localStorage.setItem('local', 'value1');
      sessionStorage.setItem('session', 'value2');
      
      const cookies = StorageSync.getAllSyncCookies();
      expect(cookies).toHaveProperty('local');
      expect(cookies).not.toHaveProperty('session');
    });

    test('should sync sessionStorage when configured', () => {
      StorageSync.config.storageType = 'sessionStorage';
      StorageSync.config.syncKeys = []; // Sync all keys
      StorageSync.reinitialize();
      
      localStorage.setItem('local', 'value1');
      sessionStorage.setItem('session', 'value2');
      
      const cookies = StorageSync.getAllSyncCookies();
      expect(cookies).not.toHaveProperty('local');
      expect(cookies).toHaveProperty('session');
    });

    test('should sync both storage types when configured', () => {
      StorageSync.config.storageType = 'both';
      StorageSync.config.syncKeys = []; // Sync all keys
      StorageSync.reinitialize();
      
      localStorage.setItem('local', 'value1');
      sessionStorage.setItem('session', 'value2');
      
      const cookies = StorageSync.getAllSyncCookies();
      expect(cookies).toHaveProperty('local');
      expect(cookies).toHaveProperty('session');
    });
  });

  describe('Initialization and Support', () => {
    test('should report as initialized', () => {
      expect(StorageSync.isInitialized()).toBe(true);
    });

    test('should report browser support', () => {
      expect(StorageSync.isSupported()).toBe(true);
    });

    test('should have correct version', () => {
      expect(StorageSync.version).toBe('2.0.0');
    });
  });

  describe('Sync Complete Event', () => {
    test('should dispatch sync complete event', (done) => {
      window.addEventListener('storagesynccomplete', (event) => {
        expect(event.detail).toHaveProperty('syncedCount');
        expect(event.detail).toHaveProperty('syncedKeys');
        expect(event.detail).toHaveProperty('skippedKeys');
        expect(event.detail).toHaveProperty('totalCookies');
        done();
      }, { once: true });
      
      StorageSync.syncCookiesToStorage();
    });

    test('should resolve ready() promise', async () => {
      const details = await StorageSync.ready();
      
      expect(details).toHaveProperty('syncedCount');
      expect(details).toHaveProperty('totalCookies');
      expect(typeof details.syncedCount).toBe('number');
    });
  });
});

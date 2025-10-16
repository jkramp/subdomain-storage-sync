module.exports = {
  // Use jsdom to simulate browser environment
  testEnvironment: 'jsdom',
  
  // Setup file to load the library before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test file patterns
  testMatch: ['**/tests/**/*.test.js'],
  
  // Coverage settings (optional)
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  
  // Verbose output
  verbose: true
};

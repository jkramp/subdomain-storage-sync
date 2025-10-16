module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'script',
  },
  rules: {
    // Possible Errors
    'no-console': 'off', // We use console for debugging
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Best Practices
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unused-expressions': 'error',
    'prefer-promise-reject-errors': 'error',

    // Stylistic Issues
    'indent': ['error', 2],
    'linebreak-style': 'off', // Allow both LF and CRLF for cross-platform development
    'quotes': ['error', 'double'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'comma-spacing': ['error', { before: false, after: true }],
    'comma-style': ['error', 'last'],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'object-curly-spacing': ['error', 'always'],
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always',
    }],

    // ES6
    'arrow-parens': ['error', 'always'],
    'arrow-spacing': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
  },
  globals: {
    StorageSync: 'readonly',
  },
  overrides: [
    {
      // Config files can use single quotes and Node.js globals
      files: ['*.config.js', '.eslintrc.js'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'quotes': 'off',
        'comma-dangle': 'off',
      },
    },
  ],
};
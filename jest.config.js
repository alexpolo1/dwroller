module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  globals: {
    'babel-jest': {
      configFile: './babel.config.js',
    },
  },
  // Restrict Jest to only run tests under the top-level tests/ folder to avoid
  // parsing ESM/React source files in src/ during CI runs of backend tests.
  testMatch: ['**/tests/**/*.test.js'],
  testEnvironmentOptions: {
    node: true
  }
};

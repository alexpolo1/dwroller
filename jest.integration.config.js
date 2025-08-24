module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  globals: {
    'babel-jest': {
      configFile: './babel.config.js',
    },
  },
  // Integration tests only - exclude src/tests directory
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/src/tests/'],
  testEnvironmentOptions: {
    node: true
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(axios)/)',
  ],
};
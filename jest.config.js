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
  testMatch: ['**/tests/**/*.test.js', '**/src/tests/**/*.test.js'],
  testEnvironmentOptions: {
    node: true
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!(axios)/)',
  ],
};

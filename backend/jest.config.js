export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/middleware/**/*.js',
    'src/routes/**/*.js',
    'src/utils/**/*.js'
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/integration/**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 30000,
};
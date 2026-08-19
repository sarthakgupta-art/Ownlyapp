/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Only the pure logic is unit tested here. Screens are verified by building
  // and running the app, not by asserting on rendered markup.
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

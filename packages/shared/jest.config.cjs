/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ad-sidera/config$': '<rootDir>/../config/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/index.ts', '!src/**/*.test.ts'],
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'packages/**/src/**/*.ts',
    '!**/src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  moduleNameMapper: {
    // Allow ESM-style `import ... from './foo.js'` in TS source by resolving
    // back to the underlying .ts file (ts-jest does not do this natively).
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@manya/(.*)$': '<rootDir>/packages/$1/src',
    '^@manya-os/(.*)$': '<rootDir>/packages/$1/src',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2022',
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }],
    // Tool-grade JS packages (ported from Manya: unify, stamp, vault, shield,
    // forge, signal, hawk, lens) are ESM sources. Their src/ paths are reached
    // through the @manya-os/* moduleNameMapper (real paths outside
    // node_modules), so this rule compiles them to CJS for the jest pipeline.
    // Real npm dependencies under node_modules stay excluded via
    // transformIgnorePatterns.
    '^.+\\.[cm]?js$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2022',
        esModuleInterop: true,
        skipLibCheck: true,
        allowJs: true,
      },
    }],
  },
  // Performance: run tests in parallel, fail fast.
  maxWorkers: '75%',
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  resetMocks: false,
  // Coverage optimization.
  coverageProvider: 'v8',
  verbose: false,
};

/** @type {import('eslint').Linter.Config[]} */
import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  // --- Global ignores ---
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.d.ts',
      'fix-lint.js',
      'eslint-results.json',
    ],
  },

  // --- JavaScript: source files (tools, packages) ---
  {
    files: ['tools/**/*.js', 'packages/*/{src,test,tests}/**/*.js'],
    ...js.configs.recommended[0],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },

  // --- JavaScript: test files ---
  {
    files: ['**/*.test.js', 'tests/**/*.test.js'],
    ...js.configs.recommended[0],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-undef': 'off',  // test files use node:test globals
    },
  },

  // --- Browser UI files (Lycon renderer process) ---
  {
    files: [
      'tools/lycon-browser/src/js/**/*.js',
      'tools/lycon-browser/src/bridge/**/*.js',
      'tools/lycon-browser/**/lycon-ui/**/*.js',
    ],
    ...js.configs.recommended[0],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },

  // --- TypeScript: source files ---
  {
    files: ['packages/*/src/**/*.ts'],
    ...ts.configs.recommended[0],
    languageOptions: {
      ...ts.configs.recommended[0].languageOptions,
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...ts.configs.recommended[0].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // --- TypeScript: spec/test files ---
  {
    files: ['packages/*/tests/**/*.spec.ts'],
    ...ts.configs.recommended[0],
    languageOptions: {
      ...ts.configs.recommended[0].languageOptions,
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        // Vitest globals (used by the spec.ts files)
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      ...ts.configs.recommended[0].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // --- TypeScript config files ---
  {
    files: ['vitest.config.ts'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
];

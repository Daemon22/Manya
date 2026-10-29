import globals from 'globals';
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// --- Node environment patches (auto-injected by release gate) ---
const nodeGlobals = [
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs', 'jest.config.js', 'runtime/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Keep CI focused on actionable source defects. TypeScript's compiler
      // remains the authoritative type-check gate.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      'prefer-const': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
    ],
  },
  ...nodeGlobals,
);

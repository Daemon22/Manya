import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run only the TypeScript spec files — JS tests use node --test.
    include: [
      'packages/*/tests/**/*.spec.ts',
    ],
    // Exclude dist and node_modules
    exclude: ['node_modules', 'dist'],
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: [
        'packages/constitution/src/**/*.ts',
        'packages/contracts/src/**/*.ts',
        'packages/council/src/**/*.ts',
        'packages/customs-shield/src/**/*.ts',
        'packages/nervous-system/src/**/*.ts',
        'packages/weave/src/**/*.ts',
      ],
      exclude: ['**/*.d.ts', '**/*.test.*', '**/dist/**', '**/node_modules/**'],
      reportsDirectory: 'coverage',
    },
    // Use the root tsconfig for type-stripping
    typecheck: {
      only: true,
      tsconfig: './tsconfig.json',
    },
  },
});

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'server/data/*'],
  },
  {
    rules: {
      // The base rule cannot parse TypeScript declaration syntax and flags every
      // parameter name inside an interface's method signatures. Unused values
      // are caught accurately by `tsc --noUnusedLocals` instead — see the
      // `typecheck` script, which the `lint` script runs alongside ESLint.
      'no-unused-vars': 'off',
    },
  },
  {
    // The push server is plain Node, not React Native, so it has Node globals.
    files: ['server/**/*.mjs'],
    languageOptions: {
      globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly', fetch: 'readonly' },
    },
  },
]);

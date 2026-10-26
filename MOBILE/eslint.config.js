// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // These screens mirror the website's components (FRONTEND/), which write
      // array types as Array<T>; keeping the same form keeps the two easy to compare.
      '@typescript-eslint/array-type': 'off',
      // Same reason: the website's pages load route params and saved preferences
      // into state from an effect, and so do their native twins.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['dist/*', '.expo/*'],
  },
]);

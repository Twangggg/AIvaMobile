const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');
const simpleImportSortPlugin = require('eslint-plugin-simple-import-sort');
const unusedImportsPlugin = require('eslint-plugin-unused-imports');
const boundariesPlugin = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
      'unused-imports': unusedImportsPlugin,
      boundaries: boundariesPlugin,
    },
    settings: {
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared/*' },
        { type: 'services', pattern: 'src/services/*' },
        { type: 'theme', pattern: 'src/theme/*' },
        { type: 'config', pattern: 'src/config/*' },
        { type: 'hooks', pattern: 'src/hooks/*' },
        { type: 'navigation', pattern: 'src/navigation/*' },
        { type: 'features', pattern: 'src/features/*' },
      ],
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_' }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-named-as-default-member': 'off',
      'boundaries/dependencies': ['error', { default: 'allow' }],
    },
  },
]);

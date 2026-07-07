const js = require('@eslint/js');
const globals = require('globals');
const tsEslint = require('typescript-eslint');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    files: ['eslint.config.js', 'forge.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: [
      'src/index.ts',
      'src/preload.ts',
      'src/utils/**/*.ts',
      'forge.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/preload.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/types.d.ts', 'src/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/render/**/*.ts', 'src/renderer.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-redeclare': 'off',
    },
  },
  {
    ignores: ['dist/', 'out/', 'node_modules/', 'assets/', 'img/', 'libs/'],
  },
];

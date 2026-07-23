/**
 * Configuração ESLint base compartilhada (eslintrc). Apps e packages estendem
 * via `extends: ['@ad-sidera/eslint-config']`.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier',
  ],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': 'off',
  },
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '.expo',
    'coverage',
    '*.config.js',
    '*.config.cjs',
  ],
};

module.exports = {
  extends: ['@ad-sidera/eslint-config'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Nest usa muitos decorators e injeção; relaxamos algumas regras.
    '@typescript-eslint/no-extraneous-class': 'off',
  },
};

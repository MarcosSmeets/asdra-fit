module.exports = {
  root: true,
  extends: ['@ad-sidera/eslint-config'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'react-hooks'],
  settings: { react: { version: 'detect' } },
  env: { browser: true, es2022: true },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', '.expo', 'babel.config.js', 'metro.config.js', 'jest.config.js'],
};

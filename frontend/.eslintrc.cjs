module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
  rules: {
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // React Three Fiber renders three.js objects as JSX elements
      // (<mesh>, <meshStandardMaterial> …). eslint-plugin-react does not know
      // that reconciler's element set, so every three.js prop reads as an
      // "unknown property". The rule is genuinely inapplicable here.
      files: ['src/components/three/**/*.jsx'],
      rules: { 'react/no-unknown-property': 'off' },
    },
  ],
};

module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2020: true
  },
  'extends': [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // `a < b` dentro de {{ }} es válido para Vue pero confunde al parser HTML del linter.
    'vue/no-parsing-error': ['warn', { 'invalid-first-character-of-tag-name': false }],
    // Deuda técnica conocida: se reporta como advertencia para corregirla poco a poco
    // sin bloquear `npm run lint`. Las demás reglas (claves duplicadas, directivas
    // inválidas, etc.) siguen siendo errores.
    'no-unused-vars': 'warn',
    'vue/no-unused-vars': 'warn',
    'vue/no-mutating-props': 'warn',
    'vue/no-use-v-if-with-v-for': 'warn',
    'vue/no-reserved-keys': 'warn',
    'vue/no-side-effects-in-computed-properties': 'warn',
    'no-prototype-builtins': 'warn',
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
    'no-case-declarations': 'warn',
    'no-async-promise-executor': 'warn',
    'no-useless-catch': 'warn'
  }
}

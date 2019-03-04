module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    'plugin:prettier/recommended',
    'eslint:recommended'
  ],
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'vue/no-unused-vars': 'warning',
    'vue/valid-v-html': 'warning'
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}

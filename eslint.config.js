import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/**', 'ios/**', 'android/**', 'legacy/**'] },
  js.configs.recommended, ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.serviceworker } }, rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
)

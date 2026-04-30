import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // `dist/` is build output. `kerv-one-theme/` is a vendored design-system
  // package dropped pristine in Phase 1a (see kerv-one-theme/INTEGRATION_NOTES.md
  // and HANDOFF — it should not be edited as part of restructuring work).
  // `playwright-report/` and `test-results/` are Playwright run artifacts.
  { ignores: ['dist', 'kerv-one-theme/**', 'playwright-report/**', 'test-results/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Stub interfaces (e.g. `CognitoAuthService.signIn(_email, _password)`)
      // intentionally accept arguments they don't yet use; the underscore
      // prefix is the standard convention for "deliberately unused".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)

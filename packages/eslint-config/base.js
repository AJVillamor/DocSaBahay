// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint flat config for every workspace package.
 * Type-aware rules run against the package's own tsconfig.
 *
 * @param {string} tsconfigRootDir Absolute path of the consuming package.
 */
export function baseConfig(tsconfigRootDir) {
  return tseslint.config(
    { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-empty': ['error', { allowEmptyCatch: false }],
      },
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      ...tseslint.configs.disableTypeChecked,
    },
    prettier,
  );
}

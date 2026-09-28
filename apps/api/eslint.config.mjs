import { baseConfig } from '@doksabahay/eslint-config/base';

export default [
  ...baseConfig(import.meta.dirname),
  {
    rules: {
      // Nest DI needs runtime imports for constructor parameter types.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];

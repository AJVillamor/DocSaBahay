import { baseConfig } from '@doksabahay/eslint-config/base';
import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['next-env.d.ts', '.next/**'] },
  ...nextVitals,
  ...baseConfig(import.meta.dirname),
];

export default config;

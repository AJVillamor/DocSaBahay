import path from 'node:path';

import type { NextConfig } from 'next';

// Resolved at build time: rewrites are baked into the build output,
// so the Docker image receives API_URL as a build argument.
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  poweredByHeader: false,
  // The browser calls the API same-origin via /api/*, so auth cookies stay first-party.
  rewrites() {
    return Promise.resolve([{ source: '/api/:path*', destination: `${apiUrl}/:path*` }]);
  },
};

export default nextConfig;

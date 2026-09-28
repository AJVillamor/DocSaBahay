import { createHash } from 'node:crypto';

/**
 * Derives a stable UUID (version-5 layout) from a seed key, so re-running the
 * seed targets the same rows (e.g. `seedId('appointment:c1')`).
 */
export function seedId(key: string): string {
  const hex = createHash('sha256').update(`doksabahay-seed:${key}`).digest('hex');
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

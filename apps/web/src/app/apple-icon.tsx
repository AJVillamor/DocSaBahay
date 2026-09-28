import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS "Add to Home Screen" icon: same brand mark as `icon.tsx`, scaled up. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F766E',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 28 28" fill="none">
          <path
            d="M14 3L25 11V25H3V11L14 3Z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M14 20c-3.5-2.3-5.5-4.2-5.5-6.6 0-1.9 1.5-3.4 3.4-3.4 1.1 0 2.1.5 2.1 1.4 0-.9 1-1.4 2.1-1.4 1.9 0 3.4 1.5 3.4 3.4 0 2.4-2 4.3-5.5 6.6z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}

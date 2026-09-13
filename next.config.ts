import type { NextConfig } from "next";

// Static assets kept under fixed filenames (not Next.js-hashed). When their
// contents change, a long default CDN cache would keep serving the stale copy
// for up to a year, so we force a short TTL with revalidation. SW cache
// behavior is separately constrained via CACHE_VERSION in public/sw.js.
const SHORT_LIVED_ASSET_CACHE = 'public, max-age=86400, must-revalidate'

const nextConfig: NextConfig = {
  // The app never renders `next/image` (icons/PDF pages are plain <img> /
  // canvas), yet the default config still exposes the `/_next/image`
  // optimizer endpoint in production. Turning optimization off removes that
  // unused attack surface (image-optimizer DoS / AVIF advisories in the
  // next@<16.3.3 audit set) — with `unoptimized`, `/_next/image` answers 4xx.
  images: { unoptimized: true },
  // Do not advertise the framework via `x-powered-by: Next.js`.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/psalter.pdf',
        headers: [{ key: 'Cache-Control', value: SHORT_LIVED_ASSET_CACHE }],
      },
      {
        source: '/pdf.worker.min.mjs',
        headers: [{ key: 'Cache-Control', value: SHORT_LIVED_ASSET_CACHE }],
      },
    ]
  },
};

export default nextConfig;

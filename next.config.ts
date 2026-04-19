import type { NextConfig } from "next";

// Static assets kept under fixed filenames (not Next.js-hashed). When their
// contents change, a long default CDN cache would keep serving the stale copy
// for up to a year, so we force a short TTL with revalidation. SW cache
// behavior is separately constrained via CACHE_VERSION in public/sw.js.
const SHORT_LIVED_ASSET_CACHE = 'public, max-age=86400, must-revalidate'

const nextConfig: NextConfig = {
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

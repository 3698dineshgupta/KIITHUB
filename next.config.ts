import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'qbgmidxjhqznldfpvory.supabase.co',
      'res.cloudinary.com'
    ],
    formats: ['image/avif', 'image/webp']
  },

  async headers() {
    return [
      {
        // Site-wide baseline security headers. Deliberately not adding a
        // Content-Security-Policy here — this app relies on Next.js inline
        // hydration scripts, Google Fonts, and third-party image hosts, and
        // a CSP tight enough to matter needs careful per-source auditing to
        // avoid breaking things; left as a manual follow-up.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ]
      },
      {
        source: '/api/stream/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, no-cache, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          }
        ]
      }
    ]
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb'
    }
  },
  // Allow large uploads in API routes
  serverExternalPackages: [],
  poweredByHeader: false,
};

export default nextConfig;

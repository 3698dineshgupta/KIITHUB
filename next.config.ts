import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com'
    ],
    formats: ['image/avif', 'image/webp']
  },

  async headers() {
    return [
      {
        source: '/api/stream/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, no-cache, must-revalidate'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
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
    middlewareClientMaxBodySize: '50mb'
  }
};

export default nextConfig;

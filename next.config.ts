import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf/pdfjs's Document loading task isn't safe against React 18
  // Strict Mode's dev-only double-invoke of effects (mount → cleanup →
  // remount): the cleanup's destroy() races the in-flight getDocument()
  // promise from the first mount, which then tries to message a worker
  // transport that's already been nulled out — surfaces as "Cannot read
  // properties of null (reading 'sendWithPromise')". Dev-only; doesn't
  // affect production, where Strict Mode never double-invokes regardless.
  reactStrictMode: false,
  images: {
    // remotePatterns (not the deprecated `domains`) so each host is scoped
    // to https and its actual path shape, rather than trusting any path on it.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'qbgmidxjhqznldfpvory.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    // Optimized image responses are immutable per unique query (url+width+
    // quality) — cache them at the edge/browser for a day instead of
    // Next's 60s default, cutting repeat-visit image requests entirely.
    minimumCacheTTL: 86400,
  },

  async headers() {
    // Every external resource this app actually loads, audited from source:
    // - script/style: Next.js's own hydration bootstrap and Radix UI's
    //   inline style attributes need 'unsafe-inline' (no nonce plumbing
    //   exists yet); dev mode's Fast Refresh additionally needs 'unsafe-eval'.
    // - img: next/image proxies Cloudinary/Supabase/Google avatars through
    //   this origin, but a few raw <img> tags (admin QR code URL, local
    //   object-URL previews) load arbitrary https/blob sources directly.
    // - font: next/font self-hosts Google Fonts at build time — no
    //   fonts.googleapis.com request ever happens at runtime. `data:` is
    //   also needed: pdf.js embeds some PDF-internal fonts as base64 data
    //   URIs when rendering — that's content generated from the document
    //   itself, not a remote fetch, so allowing it doesn't weaken the policy.
    // - worker: react-pdf's worker is fetched from unpkg.com (see
    //   components/pdf/pdf-viewer.tsx for why it can't be self-hosted).
    //   pdf.js's own loader (pdfjs-dist's PDFWorker._initialize) detects that
    //   URL is cross-origin and does NOT construct the Worker from it
    //   directly — it wraps it: `new Worker(blob:...)` running
    //   `await import("https://unpkg.com/...")`. That means TWO directives
    //   need the CDN, not one: worker-src needs `blob:` (the wrapper itself)
    //   and script-src needs unpkg.com (the dynamic import happening inside
    //   that worker). Missing either breaks every PDF in production with a
    //   "Secure Stream Failure" — confirmed by reading pdfjs-dist's actual
    //   worker-construction code, not guessed.
    // - connect: every fetch() in this app is same-origin.
    const isDev = process.env.NODE_ENV === 'development'
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://unpkg.com${isDev ? " 'unsafe-eval'" : ''}`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' blob: data: https:`,
      `font-src 'self' data:`,
      `connect-src 'self'${isDev ? ' ws:' : ''}`,
      `worker-src 'self' blob: https://unpkg.com`,
      `frame-ancestors 'self'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `object-src 'none'`,
    ].join('; ')

    return [
      {
        // Site-wide baseline security headers.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
          // Vercel already adds this for custom domains, but setting it here
          // too keeps the app correctly secured if it's ever hosted elsewhere.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
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

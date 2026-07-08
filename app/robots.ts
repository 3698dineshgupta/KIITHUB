import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.kiithub.in.net').replace(/\/+$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // No trailing slash: a bare `/admin` disallow rule blocks both the
      // exact path and every subpath, whereas `/admin/` alone does not
      // reliably block the bare (no-slash) path per the robots.txt spec.
      disallow: [
        '/admin',
        '/api',
        '/dashboard',
        '/profile',
        '/login',
        '/register',
        '/auth',
        '/merchandise/sell',
        '/merchandise/my-listings',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

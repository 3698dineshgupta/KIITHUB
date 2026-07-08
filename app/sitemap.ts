import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kiithub.com').replace(/\/+$/, '');

  // Fetch dynamic routes
  const notes = await prisma.note.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  const pyqs = await prisma.pYQ.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  const noteUrls: MetadataRoute.Sitemap = notes.map((note) => ({
    url: `${baseUrl}/notes/${note.slug}`,
    lastModified: note.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const pyqUrls: MetadataRoute.Sitemap = pyqs.map((pyq) => ({
    url: `${baseUrl}/pyq/${pyq.slug}`,
    lastModified: pyq.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Define static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pyq`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/premium`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  return [...staticRoutes, ...noteUrls, ...pyqUrls];
}

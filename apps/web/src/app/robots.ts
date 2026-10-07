import type { MetadataRoute } from 'next';
import { SITE_INDEXABLE, canonicalUrl } from '@/lib/site/site-config';

/** Staging and preview deployments must never be indexed. */
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/vehicles', '/how-it-works', '/apply', '/contact', '/privacy'],
      disallow: ['/api/', '/login', '/auth/'],
    },
    sitemap: canonicalUrl('/sitemap.xml'),
  };
}

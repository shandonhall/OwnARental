import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/site/site-config';
import { getWebsiteVehicles } from '@/lib/site/vehicles';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getWebsiteVehicles();
  const pages = ['/', '/vehicles', '/how-it-works', '/apply', '/contact', '/privacy'];
  return [
    ...pages.map((path) => ({
      url: canonicalUrl(path),
      changeFrequency: path === '/vehicles' ? ('daily' as const) : ('monthly' as const),
      priority: path === '/' ? 1 : path === '/vehicles' ? 0.9 : 0.6,
    })),
    ...vehicles
      .filter((vehicle) => vehicle.availability !== 'UNAVAILABLE')
      .map((vehicle) => ({
        url: canonicalUrl(`/vehicles/${vehicle.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
  ];
}

/**
 * Single source of truth for the public website: contact details, navigation
 * and URL helpers. Contact values match the live ownarental.co.za site.
 */

export const SITE_NAME = 'Own A Rental';
export const SITE_TAGLINE = 'Giving You Wheels';

/** Public domain used for canonical URLs, sitemap and structured data. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ownarental.co.za'
).replace(/\/$/, '');

/** Search engines may only index the real domain, never staging or previews. */
export const SITE_INDEXABLE = process.env.NEXT_PUBLIC_SITE_ENV === 'production';

/**
 * While the site is hosted alongside the dashboard, public pages live under
 * /website. At go-live this becomes '' and the domain serves them at the root.
 */
const BASE_PATH = '/website';

export function sitePath(path = '/'): string {
  const clean = path === '/' ? '' : path;
  return `${BASE_PATH}${clean}` || '/';
}

export function canonicalUrl(path = '/'): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

export const SITE_CONTACT = {
  phonePrimary: '+27 11 477 6222',
  phonePrimaryDisplay: '011 477 6222',
  phonePrimaryTel: '+27114776222',
  phoneSecondary: '+27 71 040 7799',
  phoneSecondaryDisplay: '071 040 7799',
  phoneSecondaryTel: '+27710407799',
  email: 'sales@ownarental.co.za',
  whatsapp: 'https://wa.me/27710407799',
  address: '1 Main Road, Newlands, Randburg, 2092',
  mapsUrl: 'https://maps.google.com/?q=1+Main+Road+Newlands+Randburg+2092',
} as const;

export function whatsappLink(message?: string): string {
  if (!message) return SITE_CONTACT.whatsapp;
  return `${SITE_CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const SITE_NAV = [
  { path: '/', label: 'Home' },
  { path: '/vehicles', label: 'Vehicles' },
  { path: '/how-it-works', label: 'How It Works' },
  { path: '/apply', label: 'Apply' },
  { path: '/contact', label: 'Contact' },
] as const;

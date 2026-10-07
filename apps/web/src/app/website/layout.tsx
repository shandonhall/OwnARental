import type { Metadata } from 'next';
import {
  SITE_INDEXABLE,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Long-Term Vehicle Rental in Randburg`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Long-term vehicle rental from Own A Rental in Newlands, Randburg. Browse available vehicles and apply online.',
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_ZA',
  },
};

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

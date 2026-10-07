import type { Metadata } from 'next';
import { SectionHeading } from '@/components/site/section-heading';
import { SITE_CONTACT, canonicalUrl } from '@/lib/site/site-config';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Own A Rental handles your personal information.',
  alternates: { canonical: canonicalUrl('/privacy') },
};

/** PLACEHOLDER — replace with Own A Rental's approved privacy policy text. */
export default function PrivacyPage() {
  return (
    <section className="bg-white">
      <div className="site-container max-w-3xl py-10 sm:py-14">
        <SectionHeading as="h1" eyebrow="Legal" title="Privacy policy" />
        <div className="mt-6 space-y-4 leading-relaxed text-[var(--oar-navy)]">
          <p>Our full privacy policy is being finalised and will be published here.</p>
          <p>
            If you have a question about how we handle your personal information, please email{' '}
            <a href={`mailto:${SITE_CONTACT.email}`} className="font-semibold text-[var(--oar-red)] hover:underline">
              {SITE_CONTACT.email}
            </a>{' '}
            or call {SITE_CONTACT.phonePrimaryDisplay}.
          </p>
        </div>
      </div>
    </section>
  );
}

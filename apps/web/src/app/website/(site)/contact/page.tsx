import type { Metadata } from 'next';
import Link from 'next/link';
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '@/components/site/icons';
import { SectionHeading } from '@/components/site/section-heading';
import {
  SITE_CONTACT,
  canonicalUrl,
  sitePath,
  whatsappLink,
} from '@/lib/site/site-config';

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Contact Own A Rental in Newlands, Randburg by phone, WhatsApp or email about long-term vehicle rental.',
  alternates: { canonical: canonicalUrl('/contact') },
};

const METHODS = [
  {
    icon: WhatsAppIcon,
    title: 'WhatsApp',
    value: SITE_CONTACT.phoneSecondaryDisplay,
    href: whatsappLink('Hi Own A Rental, I have a question.'),
    external: true,
    accent: 'bg-[#25d366] text-white',
  },
  {
    icon: PhoneIcon,
    title: 'Call us',
    value: SITE_CONTACT.phonePrimaryDisplay,
    href: `tel:${SITE_CONTACT.phonePrimaryTel}`,
    external: false,
    accent: 'bg-[var(--oar-red)] text-white',
  },
  {
    icon: MailIcon,
    title: 'Email',
    value: SITE_CONTACT.email,
    href: `mailto:${SITE_CONTACT.email}`,
    external: false,
    accent: 'bg-[var(--oar-blue)] text-white',
  },
  {
    icon: PinIcon,
    title: 'Visit us',
    value: SITE_CONTACT.address,
    href: SITE_CONTACT.mapsUrl,
    external: true,
    accent: 'bg-[var(--oar-navy)] text-white',
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="site-container py-10 sm:py-14">
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title="Talk to our team"
            intro="WhatsApp is usually the quickest way to reach us."
          />
        </div>
      </section>

      <section className="site-section bg-[var(--oar-mist)] !pt-10">
        <div className="site-container">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {METHODS.map(({ icon: Icon, title, value, href, external, accent }) => (
              <li key={title}>
                <a
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex h-full flex-col rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="site-display mt-4 text-xl font-bold text-[var(--oar-navy)]">{title}</h2>
                  <p className="mt-1 break-words text-[var(--oar-grey)]">{value}</p>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="site-display text-2xl font-bold text-[var(--oar-navy)]">
                Ready to apply?
              </h2>
              <p className="mt-1 text-[var(--oar-grey)]">
                Send a short application and our team will call you back.
              </p>
            </div>
            <Link href={sitePath('/apply')} className="site-btn site-btn-primary site-btn-lg">
              Apply Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import {
  SITE_CONTACT,
  SITE_NAV,
  SITE_TAGLINE,
  sitePath,
  whatsappLink,
} from '@/lib/site/site-config';
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from './icons';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--oar-navy)] text-slate-200">
      <div className="site-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Image
            src="/brand/oar-logo.svg"
            alt="Own A Rental"
            width={202}
            height={40}
            className="h-10 w-auto brightness-0 invert"
          />
          <p className="max-w-xs text-sm leading-relaxed text-slate-300">
            Long-term vehicle rental from Newlands, Randburg. {SITE_TAGLINE}.
          </p>
        </div>

        <div>
          <h2 className="site-footer-heading">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SITE_NAV.map((item) => (
              <li key={item.path}>
                <Link href={sitePath(item.path)} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="site-footer-heading">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={`tel:${SITE_CONTACT.phonePrimaryTel}`} className="flex items-center gap-2.5 hover:text-white">
                <PhoneIcon className="h-4 w-4 shrink-0 text-[var(--oar-gold)]" />
                {SITE_CONTACT.phonePrimaryDisplay}
              </a>
            </li>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-white">
                <WhatsAppIcon className="h-4 w-4 shrink-0 text-[var(--oar-gold)]" />
                {SITE_CONTACT.phoneSecondaryDisplay} (WhatsApp)
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE_CONTACT.email}`} className="flex items-center gap-2.5 hover:text-white">
                <MailIcon className="h-4 w-4 shrink-0 text-[var(--oar-gold)]" />
                {SITE_CONTACT.email}
              </a>
            </li>
            <li>
              <a href={SITE_CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-white">
                <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--oar-gold)]" />
                {SITE_CONTACT.address}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="site-footer-heading">Get started</h2>
          <p className="mt-4 text-sm text-slate-300">
            Found a vehicle you like? Apply online in a few minutes.
          </p>
          <Link href={sitePath('/apply')} className="site-btn site-btn-primary mt-4">
            Apply Now
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-container flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Own A Rental. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href={sitePath('/privacy')} className="hover:text-white">
              Privacy policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

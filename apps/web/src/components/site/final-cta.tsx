import Link from 'next/link';
import { sitePath, whatsappLink } from '@/lib/site/site-config';
import { WhatsAppIcon } from './icons';

export function FinalCta({
  title = 'Ready to get moving?',
  copy = 'Browse our vehicles or send a short application. Our team will take it from there.',
}: {
  title?: string;
  copy?: string;
}) {
  return (
    <section className="bg-[var(--oar-red)] py-14 text-white sm:py-16">
      <div className="site-container flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="site-display text-3xl font-bold sm:text-4xl">{title}</h2>
          <p className="mt-3 text-white/90">{copy}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={sitePath('/apply')}
            className="site-btn site-btn-lg bg-white text-[var(--oar-red)] hover:bg-slate-100"
          >
            Apply Now
          </Link>
          <Link href={sitePath('/vehicles')} className="site-btn site-btn-lg site-btn-light">
            Browse Vehicles
          </Link>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="site-btn site-btn-lg site-btn-light"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

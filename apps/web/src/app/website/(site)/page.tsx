import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FinalCta } from '@/components/site/final-cta';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { ArrowRightIcon, NamedIcon, WhatsAppIcon } from '@/components/site/icons';
import { JsonLd } from '@/components/site/json-ld';
import { RequirementsList } from '@/components/site/requirements-list';
import { SectionHeading } from '@/components/site/section-heading';
import { Testimonials } from '@/components/site/testimonials';
import { VehicleCarousel } from '@/components/site/vehicle-carousel';
import {
  SITE_CONTACT,
  canonicalUrl,
  sitePath,
  whatsappLink,
} from '@/lib/site/site-config';
import {
  BENEFITS,
  HERO,
  PRICING_DISCLAIMER,
  REQUIREMENTS,
  WHAT_WE_DO,
} from '@/lib/site/site-content';
import { getFeaturedVehicles } from '@/lib/site/vehicles';

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl('/') },
};

export default async function HomePage() {
  const featured = await getFeaturedVehicles();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AutoRental',
          name: 'Own A Rental',
          url: canonicalUrl('/'),
          logo: canonicalUrl('/brand/oar-logo.svg'),
          image: canonicalUrl('/brand/hero-car.webp'),
          telephone: SITE_CONTACT.phonePrimary,
          email: SITE_CONTACT.email,
          address: {
            '@type': 'PostalAddress',
            streetAddress: '1 Main Road, Newlands',
            addressLocality: 'Randburg',
            postalCode: '2092',
            addressCountry: 'ZA',
          },
        }}
      />
      <section className="relative overflow-hidden bg-white">
        <div className="site-container grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-20">
          <div>
            <p className="site-eyebrow">{HERO.eyebrow}</p>
            <h1 className="site-display mt-3 text-[2.6rem] leading-[1.02] font-bold text-[var(--oar-navy)] sm:text-6xl lg:text-[4.25rem]">
              {HERO.heading}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--oar-grey)]">
              {HERO.copy}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={sitePath('/apply')} className="site-btn site-btn-primary site-btn-lg">
                Apply Now / See If You Qualify
              </Link>
              <Link href={sitePath('/vehicles')} className="site-btn site-btn-outline site-btn-lg">
                Browse Vehicles
              </Link>
            </div>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[var(--oar-navy)] hover:text-[var(--oar-red)]"
            >
              <WhatsAppIcon className="h-5 w-5 text-[#25d366]" />
              Questions? WhatsApp us on {SITE_CONTACT.phoneSecondaryDisplay}
            </a>
          </div>
          <div className="relative">
            <Image
              src="/brand/hero-car.webp"
              alt="Own A Rental vehicle"
              width={1200}
              height={632}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="site-section bg-[var(--oar-mist)]" aria-labelledby="what-we-do">
        <div className="site-container">
          <div id="what-we-do">
            <SectionHeading eyebrow="About us" title={WHAT_WE_DO.heading} intro={WHAT_WE_DO.copy} />
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {WHAT_WE_DO.items.map((item) => (
              <li key={item.title} className="rounded-xl bg-white p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--oar-red)]/10 text-[var(--oar-red)]">
                  <NamedIcon name={item.icon} className="h-6 w-6" />
                </span>
                <h3 className="site-display mt-4 text-xl font-bold text-[var(--oar-navy)]">
                  {item.title}
                </h3>
                <p className="mt-2 leading-relaxed text-[var(--oar-grey)]">{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-section bg-white" aria-labelledby="how-it-works">
        <div className="site-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div id="how-it-works">
              <SectionHeading eyebrow="How it works" title="Four simple steps" />
            </div>
            <Link
              href={sitePath('/how-it-works')}
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-[var(--oar-red)] hover:underline"
            >
              More about the process
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10">
            <HowItWorksSteps />
          </div>
        </div>
      </section>

      <section className="site-section bg-[var(--oar-navy)]" aria-labelledby="benefits">
        <div className="site-container">
          <div id="benefits">
            <SectionHeading eyebrow="Why Own A Rental" title="Built to keep things simple" tone="light" />
          </div>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title}>
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-[var(--oar-gold)]">
                  <NamedIcon name={benefit.icon} className="h-6 w-6" />
                </span>
                <h3 className="site-display mt-4 text-xl font-bold text-white">{benefit.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-300">{benefit.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-section bg-white" aria-labelledby="requirements">
        <div className="site-container grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div id="requirements">
              <SectionHeading
                eyebrow="Do I qualify?"
                title={REQUIREMENTS.heading}
                intro="Have these documents ready. Our team will ask for them once you have applied."
              />
            </div>
            <div className="mt-8">
              <RequirementsList />
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--oar-mist)] p-6 sm:p-10">
            <h3 className="site-display text-3xl font-bold text-[var(--oar-navy)]">
              See if you qualify
            </h3>
            <p className="mt-3 leading-relaxed text-[var(--oar-grey)]">
              Send a short application with your name and number. There are no documents to upload
              at this stage.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href={sitePath('/apply')} className="site-btn site-btn-primary site-btn-lg">
                Start your application
              </Link>
              <a
                href={whatsappLink('Hi Own A Rental, I would like to know if I qualify.')}
                target="_blank"
                rel="noopener noreferrer"
                className="site-btn site-btn-whatsapp site-btn-lg"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Ask us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="site-section bg-[var(--oar-mist)]" aria-labelledby="featured-vehicles">
        <div className="site-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div id="featured-vehicles">
              <SectionHeading eyebrow="Vehicles" title="Featured vehicles" />
            </div>
            <Link href={sitePath('/vehicles')} className="site-btn site-btn-outline self-start sm:self-auto">
              View all vehicles
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8">
            <VehicleCarousel vehicles={featured} label="Featured vehicles" />
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-[var(--oar-grey)]">
            {PRICING_DISCLAIMER}
          </p>
        </div>
      </section>

      <Testimonials />

      <FinalCta />
    </>
  );
}

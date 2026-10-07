import Image from 'next/image';
import {
  ContactSection,
  QualifySection,
  SiteFooter,
  SiteHeader,
  SitePage,
} from '@/components/website-chrome';
import {
  DealHashFocus,
  DealStockGrid,
  KeysTodayBand,
  Marquee,
  RateCalculator,
  Reveal,
} from '@/components/website-motion';
import { WebsiteShell } from '@/components/website-shell';
import { DEALS_TICKER } from '@/lib/website-content';

export default function DealsPage() {
  return (
    <WebsiteShell>
      <SitePage>
        <SiteHeader />
        <DealHashFocus />

        <section className="hero-section page-hero relative isolate min-h-[70svh] overflow-hidden bg-[var(--oar-navy)]">
          <Image
            src="/brand/hero-car.webp"
            alt="Own A Rental deals"
            fill
            priority
            className="hero-media animate-hero-media object-cover object-[55%_40%]"
          />
          <div className="hero-shade absolute inset-0 bg-[linear-gradient(165deg,rgba(26,40,50,0.95)_0%,rgba(26,40,50,0.82)_50%,rgba(234,176,36,0.22)_100%)]" />
          <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />

          <div className="hero-copy relative mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-36 md:px-8 md:pb-20">
            <p className="animate-rise section-eyebrow text-[var(--oar-gold)]">
              For restricted clients · Dealer&apos;s choice
            </p>
            <h1 className="hero-title animate-rise-delay font-marketing mt-3 max-w-4xl text-4xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-5xl md:text-7xl">
              Drive away
              <span className="gold-underline mt-2 block text-[var(--oar-gold)]">
                smiling
              </span>
            </h1>
            <p className="hero-sub animate-rise-delay-2 mt-4 max-w-xl text-sm text-white/85 md:text-lg">
              ITC listed, bank declined or blacklisted — look no further. Browse
              current stock with estimated monthly instalments and CIP options.
            </p>
            <div className="hero-actions animate-rise-delay-3 mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#stock" className="btn-primary cta-pulse">
                View stock
              </a>
              <a href="#calculator" className="btn-ghost-on-dark">
                Estimate your rate
              </a>
            </div>
          </div>
        </section>

        <Marquee items={DEALS_TICKER} />

        <section
          id="stock"
          className="deals-section bg-[var(--oar-mist)] px-4 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal from="left">
              <p className="section-eyebrow text-[var(--oar-blue)]">
                Current deals
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-6xl">
                Ready when
                <span className="text-[var(--oar-red)]"> you are</span>
              </h2>
              <p className="section-copy mt-4 max-w-2xl">
                Monthly instalments are estimated rental amounts. Images are
                illustrative. Confirm CIP, insurance and extras with the team
                before you commit.
              </p>
            </Reveal>

            <DealStockGrid />
          </div>
        </section>

        <KeysTodayBand />

        <section
          id="calculator"
          className="calculator-section relative overflow-hidden bg-[var(--oar-navy)] px-4 py-16 text-white md:px-8 md:py-24"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(192,23,37,0.28),transparent_42%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.05fr] md:items-center">
            <Reveal from="left">
              <p className="section-eyebrow text-[var(--oar-gold)]">
                Interactive estimate
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                Slide the price.
                <span className="block text-[var(--oar-gold)]">
                  See the monthly.
                </span>
              </h2>
              <p className="section-copy mt-4 max-w-md text-white/70">
                Toggle 10% or 20% contract initiation payment (CIP) — numbers
                mirror the live Own A Rental rate table for demos.
              </p>
              <p className="legal-note legal-note-on-dark mt-4 max-w-md">
                Estimates only. Insurance, tracker, warranty and admin may be
                separate unless stated on the deal.
              </p>
            </Reveal>
            <Reveal delay={140} from="right">
              <RateCalculator />
            </Reveal>
          </div>
        </section>

        <QualifySection
          eyebrow="We are able to assist"
          title={
            <>
              Bring these
              <span className="text-[var(--oar-red)]"> documents</span>
            </>
          }
        />
        <ContactSection defaultService="Rent To Own" />
        <SiteFooter />
      </SitePage>
    </WebsiteShell>
  );
}

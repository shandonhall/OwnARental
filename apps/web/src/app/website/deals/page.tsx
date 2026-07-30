import Image from 'next/image';
import {
  ContactSection,
  QualifySection,
  SiteFooter,
  SiteHeader,
  SitePage,
} from '@/components/website-chrome';
import {
  DealCard,
  Marquee,
  RateCalculator,
  Reveal,
} from '@/components/website-motion';
import { WebsiteShell } from '@/components/website-shell';
import { DEAL_VEHICLES, DEALS_TICKER } from '@/lib/website-content';

export default function DealsPage() {
  return (
    <WebsiteShell>
      <SitePage>
        <SiteHeader />

        <section className="hero-section page-hero relative isolate min-h-[70svh] overflow-hidden bg-[var(--oar-navy)]">
          <Image
            src="/brand/hero-car.webp"
            alt="Own A Rental deals"
            fill
            priority
            className="animate-hero-media object-cover object-[55%_40%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(26,40,50,0.95)_0%,rgba(26,40,50,0.82)_50%,rgba(234,176,36,0.22)_100%)]" />

          <div className="hero-copy relative mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-36 md:px-8 md:pb-20">
            <p className="animate-rise font-marketing text-[0.7rem] uppercase tracking-[0.28em] text-[var(--oar-gold)] md:text-sm">
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
              <a
                href="#stock"
                className="cta-pulse rounded-md bg-[var(--oar-red)] px-5 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-white"
              >
                View stock
              </a>
              <a
                href="#calculator"
                className="rounded-md border border-white/35 bg-white/10 px-5 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
              >
                Estimate your rate
              </a>
            </div>
          </div>
        </section>

        <Marquee items={DEALS_TICKER} />

        <section id="stock" className="deals-section px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-blue)]">
                Current deals
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-6xl">
                Ready when
                <span className="text-[var(--oar-red)]"> you are</span>
              </h2>
              <p className="section-copy mt-4 max-w-2xl text-base text-[var(--oar-navy)]/70">
                Monthly instalments are estimated &quot;all in&quot; rental amounts.
                Images are illustrative. Confirm CIP, insurance and extras with
                the team.
              </p>
            </Reveal>

            <div className="deals-grid mt-10 grid gap-x-4 gap-y-12 pt-8 sm:grid-cols-2 lg:grid-cols-3">
              {DEAL_VEHICLES.map((deal, index) => (
                <DealCard key={deal.id} deal={deal} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section
          id="calculator"
          className="calculator-section relative overflow-hidden bg-[var(--oar-mist)] px-4 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.05fr] md:items-center">
            <Reveal>
              <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-blue)]">
                Interactive estimate
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-5xl">
                Slide the price.
                <span className="block text-[var(--oar-red)]">See the monthly.</span>
              </h2>
              <p className="section-copy mt-4 max-w-md text-[var(--oar-navy)]/70">
                Toggle 10% or 20% contract initiation payment (CIP) — numbers
                mirror the live Own A Rental rate table for demos.
              </p>
            </Reveal>
            <Reveal delay={100}>
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

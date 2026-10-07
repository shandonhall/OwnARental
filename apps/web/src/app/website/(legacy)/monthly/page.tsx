import Image from 'next/image';
import Link from 'next/link';
import {
  ContactSection,
  QualifySection,
  SiteFooter,
  SiteHeader,
  SitePage,
} from '@/components/website-chrome';
import { CountUp, KeysTodayBand, Marquee, Reveal } from '@/components/website-motion';
import { WebsiteShell } from '@/components/website-shell';
import {
  MONTHLY_TICKER,
  RENTAL_EXCLUDES,
  RENTAL_INCLUDES,
} from '@/lib/website-content';

const steps = [
  {
    title: 'Pick your term',
    copy: '1 to 12 months — stay flexible while you get settled on the road.',
  },
  {
    title: 'Drive with cover',
    copy: 'Insurance, maintenance and tracking are handled so you focus on km.',
  },
  {
    title: 'Swap if needed',
    copy: 'After a year, change the car if it’s not vibing anymore.',
  },
];

export default function MonthlyRentalPage() {
  return (
    <WebsiteShell>
      <SitePage>
        <SiteHeader />

        <section className="hero-section page-hero relative isolate min-h-[78svh] overflow-hidden bg-[var(--oar-navy)]">
          <Image
            src="/brand/hero-car.webp"
            alt="Long-term rental vehicle"
            fill
            priority
            className="animate-hero-media object-cover object-[72%_center]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(26,40,50,0.96)_0%,rgba(26,40,50,0.78)_55%,rgba(22,128,171,0.35)_100%)]" />
          <div className="hero-glow pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-[var(--oar-blue)]/30 blur-3xl" />

          <div className="hero-copy relative mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-4 pb-20 pt-36 md:px-8 md:pb-24">
            <p className="animate-rise font-marketing text-[0.7rem] uppercase tracking-[0.28em] text-[var(--oar-gold)] md:text-sm">
              Long-term rental · Rent a car monthly
            </p>
            <h1 className="hero-title animate-rise-delay font-marketing mt-3 max-w-4xl text-4xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-5xl md:text-7xl">
              Zero hassle
              <span className="gold-underline mt-2 block text-[var(--oar-gold)]">
                driving
              </span>
            </h1>
            <p className="hero-sub animate-rise-delay-2 mt-4 max-w-xl text-sm text-white/85 md:mt-5 md:text-lg">
              Need a car but can&apos;t get financing? Long-term rental keeps you
              moving — 2,500 km free each month, insurance and maintenance
              included.
            </p>
            <div className="hero-actions animate-rise-delay-3 mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#contact" className="btn-primary cta-pulse">
                Apply for monthly
              </a>
              <Link href="/website/deals" className="btn-ghost-on-dark">
                See available cars
              </Link>
            </div>
          </div>
        </section>

        <Marquee items={MONTHLY_TICKER} />

        <section className="feature-section bg-white px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal from="left">
              <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-blue)]">
                How it works
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-6xl">
                Rent the lifestyle.
                <span className="block text-[var(--oar-red)]">Not the stress.</span>
              </h2>
            </Reveal>

            <div className="steps-grid mt-10 grid gap-3 md:mt-14 md:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal
                  key={step.title}
                  delay={index * 110}
                  from={index % 2 === 0 ? 'left' : 'right'}
                >                  <article className="step-card bg-[var(--oar-mist)] px-5 py-7 md:min-h-[16rem] md:px-6">
                    <span className="font-marketing text-3xl font-bold text-[var(--oar-gold)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-marketing mt-4 text-2xl font-bold uppercase text-[var(--oar-navy)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--oar-navy)]/70">
                      {step.copy}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="split-band relative overflow-hidden bg-[var(--oar-navy)] px-4 py-16 text-white md:px-8 md:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(22,128,171,0.35),transparent_40%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
            <Reveal from="left">
              <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-gold)]">
                From
              </p>
              <p className="price-figure font-marketing mt-2 text-5xl font-bold md:text-7xl">
                <CountUp value={4426} />
              </p>
              <p className="mt-3 max-w-md text-white/70">
                Estimated monthly for long-term rental — why buy the cow when you
                can rent the whole lifestyle?
              </p>
            </Reveal>
            <Reveal delay={140} from="right">              <div className="include-grid grid gap-3 sm:grid-cols-2">
                <div className="include-panel">
                  <p className="font-marketing text-xs uppercase tracking-[0.2em] text-[var(--oar-gold)]">
                    Rates include
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-white/85">
                    {RENTAL_INCLUDES.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-[var(--oar-gold)]">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="include-panel include-panel-muted">
                  <p className="font-marketing text-xs uppercase tracking-[0.2em] text-white/55">
                    Rates exclude
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-white/70">
                    {RENTAL_EXCLUDES.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="opacity-50">–</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <KeysTodayBand />

        <QualifySection
          eyebrow="Ready for monthly rental?"
          title={
            <>
              Same simple
              <span className="text-[var(--oar-red)]"> checklist</span>
            </>
          }
        />
        <ContactSection defaultService="Long Term Rental" />
        <SiteFooter />
      </SitePage>
    </WebsiteShell>
  );
}

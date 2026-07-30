import Image from 'next/image';
import Link from 'next/link';
import {
  ContactSection,
  QualifySection,
  SiteFooter,
  SiteHeader,
  SitePage,
  TrustSection,
} from '@/components/website-chrome';
import { CountUp, KeysTodayBand, Marquee, Reveal } from '@/components/website-motion';
import { WebsiteShell } from '@/components/website-shell';
import { HOME_TICKER, INSPECTION_CHECKS } from '@/lib/website-content';

export default function WebsiteHomePage() {
  return (
    <WebsiteShell>
      <SitePage>
        <SiteHeader />

        <section className="hero-section slash-bottom relative isolate min-h-[100svh] overflow-hidden bg-[var(--oar-navy)]">
          <Image
            src="/brand/hero-car.webp"
            alt="Own A Rental vehicle"
            fill
            priority
            className="hero-media animate-hero-media object-cover object-[68%_center]"
          />
          <div className="hero-shade absolute inset-0" />
          <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />
          <div className="hero-glow pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-[var(--oar-red)]/30 blur-3xl" />
          <div className="hero-glow pointer-events-none absolute bottom-10 right-10 h-64 w-64 rounded-full bg-[var(--oar-gold)]/25 blur-3xl" />

          <div className="hero-copy relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-24 pt-40 md:px-8 md:pb-32">
            <p className="animate-rise section-eyebrow text-[var(--oar-gold)]">
              Giving you wheels
            </p>
            <h1 className="hero-title animate-rise-delay font-marketing mt-3 max-w-4xl text-5xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-6xl md:text-8xl">
              Can&apos;t get
              <br />
              financing?
              <span className="gold-underline mt-2 block text-[var(--oar-gold)]">
                Still drive.
              </span>
            </h1>
            <p className="hero-sub animate-rise-delay-2 mt-4 max-w-xl text-sm leading-relaxed text-white/85 md:mt-6 md:text-lg">
              No stress. No judgment. Just keys in hand — built for ITC-listed,
              bank-declined, and first-time buyers.
            </p>
            <div className="hero-actions animate-rise-delay-3 mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
              <a href="#contact" className="btn-primary cta-pulse">
                Start your application
              </a>
              <Link href="/website/deals" className="btn-ghost-on-dark">
                Browse deals
              </Link>
            </div>
          </div>
        </section>

        <Marquee items={HOME_TICKER} />

        <TrustSection />

        <section className="price-section relative overflow-hidden bg-white px-4 py-16 md:px-8 md:py-24">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[var(--oar-mist)] max-md:hidden" />
          <p
            className="giant-type pointer-events-none absolute -right-4 top-8 font-marketing select-none text-[var(--oar-navy)]/[0.06] md:right-8"
            aria-hidden
          >
            DRIVE
          </p>
          <div className="price-grid relative mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-12">
            <Reveal from="left">
              <p className="section-eyebrow text-[var(--oar-blue)]">
                We offer 100% approvals*
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase leading-[0.92] tracking-tight text-[var(--oar-navy)] md:mt-4 md:text-7xl">
                Your wheels.
                <span className="mt-1 block text-[var(--oar-red)] md:mt-2">
                  With our care.
                </span>
              </h2>
              <p className="section-copy mt-4 max-w-xl md:mt-6">
                We&apos;re not here to talk credit scores — we&apos;re here to get
                you driving. Clear monthly rates. Real people on the phone.
              </p>
              <p className="legal-note mt-4 max-w-xl">
                *Subject to affordability. Final terms, CIP, insurance and extras
                are confirmed with you before you drive.
              </p>
            </Reveal>
            <Reveal className="price-block" delay={140} from="right">
              <div className="price-panel inline-block bg-[var(--oar-navy)] px-6 py-7 text-left text-white md:px-8 md:py-9">
                <p className="font-marketing text-xs uppercase tracking-[0.22em] text-[var(--oar-gold)]">
                  From
                </p>
                <p className="price-figure font-marketing mt-2 text-5xl font-bold leading-none md:text-7xl">
                  <CountUp value={4426} />
                </p>
                <p className="price-panel-note mt-3 max-w-xs text-sm text-white/70">
                  Estimated monthly · confirm inclusions with the team
                </p>
                <div className="price-panel-rule mt-5 h-1.5 w-24 bg-[var(--oar-gold)]" />
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="options"
          className="options-section relative overflow-hidden bg-[var(--oar-navy)] px-4 py-16 text-white md:px-8 md:py-24"
        >
          <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-[var(--oar-red)]/20 blur-3xl" />
          <div className="mx-auto max-w-6xl">
            <Reveal from="left">
              <p className="section-eyebrow text-[var(--oar-gold)]">
                Choose your path
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-white md:text-6xl">
                Two ways to
                <span className="text-[var(--oar-blue)]"> get moving</span>
              </h2>
            </Reveal>

            <div className="options-grid mt-8 grid gap-3 md:mt-14 md:grid-cols-2 md:gap-0">
              <Reveal from="left">
                <Link
                  href="/website/monthly"
                  className="option-card group relative block overflow-hidden bg-[#121c24] px-5 py-8 text-white md:min-h-[22rem] md:px-8 md:py-12"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(22,128,171,0.35),transparent_55%)] transition duration-500 group-hover:opacity-100" />
                  <div className="relative">
                    <p className="section-eyebrow text-[var(--oar-gold)]">
                      01 · Long-term rental
                    </p>
                    <h3 className="option-title font-marketing mt-3 text-3xl font-bold uppercase leading-none md:mt-4 md:text-4xl">
                      Zero hassle
                      <br />
                      driving
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75 md:mt-5 md:text-base">
                      1–12 months. 2,500 km free each month. Insurance and
                      maintenance handled. Swap after a year if it&apos;s not
                      vibing.
                    </p>
                    <span className="option-link mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--oar-gold)] md:mt-8">
                      Explore monthly <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
              <Reveal delay={120} from="right">
                <Link
                  href="/website/rent-to-own"
                  className="option-card group relative block overflow-hidden bg-[var(--oar-red)] px-5 py-8 text-white md:min-h-[22rem] md:px-8 md:py-12"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,176,36,0.28),transparent_55%)]" />
                  <div className="relative">
                    <p className="section-eyebrow text-white/80">
                      02 · Rent to own
                    </p>
                    <h3 className="option-title font-marketing mt-3 text-3xl font-bold uppercase leading-none md:mt-4 md:text-4xl">
                      Move at your
                      <br />
                      own speed
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85 md:mt-5 md:text-base">
                      Pick the car, we build the plan, you drive off. Every payment
                      moves you closer to ownership — ITC listing or not.
                    </p>
                    <span className="option-link mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--oar-gold)] md:mt-8">
                      Explore rent to own <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            </div>

            <Reveal className="mt-6 md:mt-8" from="up" delay={80}>
              <Link
                href="/website/deals"
                className="deals-banner group flex flex-col gap-3 border border-[var(--oar-gold)]/35 bg-[var(--oar-gold)]/10 px-5 py-6 transition hover:bg-[var(--oar-gold)]/20 md:flex-row md:items-center md:justify-between md:px-8"
              >
                <div>
                  <p className="section-eyebrow text-[var(--oar-gold)]">
                    Live stock
                  </p>
                  <p className="font-marketing mt-1 text-2xl font-bold uppercase text-white md:text-3xl">
                    See today&apos;s deals
                  </p>
                </div>
                <span className="option-link inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--oar-gold)]">
                  Browse vehicles <span aria-hidden>→</span>
                </span>
              </Link>
            </Reveal>
          </div>
        </section>

        <KeysTodayBand />

        <section className="care-section relative overflow-hidden bg-[var(--oar-mist)] px-4 py-16 md:px-8 md:py-28">
          <p
            className="giant-type pointer-events-none absolute bottom-0 left-0 font-marketing select-none text-[var(--oar-navy)]/[0.05]"
            aria-hidden
          >
            CARE
          </p>
          <div className="care-grid relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-14">
            <Reveal from="left">
              <p className="section-eyebrow text-[var(--oar-red)]">
                Pre-loved, not pre-judged
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase leading-[0.92] tracking-tight text-[var(--oar-navy)] md:mt-4 md:text-6xl">
                Inspected.
                <br />
                Ready to go.
              </h2>
              <p className="section-copy mt-4 max-w-xl md:mt-6">
                Every car is vetted — safe, clean, road-trip worthy. Tracking,
                warranty, insurance and admin are discussed before you sign.
              </p>
              <ul className="inspect-list mt-6 space-y-3">
                {INSPECTION_CHECKS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={140} from="right">
              <div className="lifestyle-frame">
                <Image
                  src="/brand/deals/car-7.webp"
                  alt="Inspected Own A Rental vehicle"
                  width={720}
                  height={540}
                  className="lifestyle-photo"
                />
                <div className="lifestyle-caption">
                  <Image
                    src="/brand/we-care.svg"
                    alt="We care"
                    width={120}
                    height={97}
                    className="h-12 w-auto"
                  />
                  <p>Handover-ready stock · Randburg</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <QualifySection />
        <ContactSection />
        <SiteFooter />
      </SitePage>
    </WebsiteShell>
  );
}

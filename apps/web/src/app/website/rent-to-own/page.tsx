import Image from 'next/image';
import Link from 'next/link';
import {
  ContactSection,
  QualifySection,
  SiteFooter,
  SiteHeader,
  SitePage,
} from '@/components/website-chrome';
import { CountUp, Marquee, Reveal } from '@/components/website-motion';
import { WebsiteShell } from '@/components/website-shell';
import { RTO_TICKER } from '@/lib/website-content';

const ownershipSteps = [
  {
    label: 'Choose',
    title: 'Pick the car',
    copy: 'Browse deals that fit your monthly — we keep it real on price and condition.',
  },
  {
    label: 'Plan',
    title: 'We build the deal',
    copy: 'CIP options, clear instalments, and a path that works with your affordability.',
  },
  {
    label: 'Drive',
    title: 'Keys in hand',
    copy: 'No credit history? Cool. ITC listed? Still good. First-time buyer? Welcome.',
  },
  {
    label: 'Own',
    title: 'Payments build equity',
    copy: 'Every payment takes you one step closer to full ownership. Your ride. Your rules.',
  },
];

export default function RentToOwnPage() {
  return (
    <WebsiteShell>
      <SitePage>
        <SiteHeader />

        <section className="hero-section page-hero relative isolate min-h-[78svh] overflow-hidden bg-[var(--oar-navy)]">
          <Image
            src="/brand/hero-car.webp"
            alt="Rent to own vehicle"
            fill
            priority
            className="animate-hero-media object-cover object-[60%_center] scale-105"
          />
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(26,40,50,0.97)_0%,rgba(192,23,37,0.45)_55%,rgba(26,40,50,0.7)_100%)]" />
          <div className="hero-glow pointer-events-none absolute -left-10 bottom-10 h-80 w-80 rounded-full bg-[var(--oar-gold)]/25 blur-3xl" />

          <div className="hero-copy relative mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-4 pb-20 pt-36 md:px-8 md:pb-24">
            <p className="animate-rise font-marketing text-[0.7rem] uppercase tracking-[0.28em] text-[var(--oar-gold)] md:text-sm">
              Rent a car to own
            </p>
            <h1 className="hero-title animate-rise-delay font-marketing mt-3 max-w-4xl text-4xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-5xl md:text-7xl">
              Move at your
              <span className="gold-underline mt-2 block text-[var(--oar-gold)]">
                own speed
              </span>
            </h1>
            <p className="hero-sub animate-rise-delay-2 mt-4 max-w-xl text-sm text-white/85 md:mt-5 md:text-lg">
              Gain the flexibility to reach your destination on time. You pick
              the car, we build the plan, you drive off — ownership grows with
              every payment.
            </p>
            <div className="hero-actions animate-rise-delay-3 mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contact"
                className="cta-pulse rounded-md bg-[var(--oar-red)] px-5 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-white"
              >
                Start rent to own
              </a>
              <Link
                href="/website/deals"
                className="rounded-md border border-white/35 bg-white/10 px-5 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
              >
                View deals
              </Link>
            </div>
          </div>
        </section>

        <Marquee items={RTO_TICKER} />

        <section className="journey-section px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-blue)]">
                Your path to ownership
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-6xl">
                Simple plan.
                <span className="text-[var(--oar-red)]"> Real wheels.</span>
              </h2>
            </Reveal>

            <ol className="journey-rail mt-12 grid gap-4 md:grid-cols-4 md:gap-0">
              {ownershipSteps.map((step, index) => (
                <Reveal key={step.label} delay={index * 110}>
                  <li className="journey-step relative bg-[var(--oar-mist)] px-5 py-7 md:bg-transparent md:px-4 md:py-0">
                    <div className="journey-node">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <p className="mt-5 font-marketing text-xs uppercase tracking-[0.22em] text-[var(--oar-gold)]">
                      {step.label}
                    </p>
                    <h3 className="font-marketing mt-2 text-xl font-bold uppercase text-[var(--oar-navy)] md:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--oar-navy)]/70">
                      {step.copy}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="preloved-section relative overflow-hidden bg-[var(--oar-navy)] px-4 py-16 text-white md:px-8 md:py-28">
          <p
            className="giant-type pointer-events-none absolute -right-2 top-6 font-marketing select-none text-white/[0.04]"
            aria-hidden
          >
            OWN
          </p>
          <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <Reveal>
              <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-gold)]">
                Pre-loved, not pre-judged
              </p>
              <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase leading-[0.92] tracking-tight md:text-6xl">
                If you can afford
                <span className="block text-[var(--oar-red)]">the monthly,</span>
                we can make it happen.
              </h2>
              <p className="section-copy mt-5 max-w-xl text-base text-white/75">
                Blacklisted? Declined? ITC? We&apos;re the dealer&apos;s choice
                for restricted clients — trusted by dealerships, chosen by drivers
                who need a second chance on the road.
              </p>
              <div className="mt-8 flex flex-wrap gap-6">
                <div>
                  <p className="font-marketing text-xs uppercase tracking-[0.18em] text-white/50">
                    From
                  </p>
                  <p className="font-marketing text-4xl font-bold md:text-5xl">
                    <CountUp value={4270} />
                  </p>
                </div>
                <div>
                  <p className="font-marketing text-xs uppercase tracking-[0.18em] text-white/50">
                    Approvals*
                  </p>
                  <p className="font-marketing text-4xl font-bold text-[var(--oar-gold)] md:text-5xl">
                    100%
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120} className="justify-self-start md:justify-self-end">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full bg-[var(--oar-red)]/20 blur-3xl" />
                <Image
                  src="/brand/we-care.svg"
                  alt="We care"
                  width={240}
                  height={194}
                  className="relative h-28 w-auto md:h-44"
                />
              </div>
            </Reveal>
          </div>
        </section>

        <QualifySection
          eyebrow="You qualify if you have"
          title={
            <>
              Already halfway
              <span className="text-[var(--oar-red)]"> there</span>
            </>
          }
        />
        <ContactSection defaultService="Rent To Own" />
        <SiteFooter />
      </SitePage>
    </WebsiteShell>
  );
}

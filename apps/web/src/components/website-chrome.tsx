'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { Reveal } from '@/components/website-motion';
import { QUALIFY_ITEMS, WEBSITE_NAV } from '@/lib/website-content';

function isActiveNav(href: string, pathname: string): boolean {
  if (href === '/website') return pathname === '/website';
  return pathname.startsWith(href);
}

export function SitePage({
  children,
  applyHref = '#contact',
}: {
  children: ReactNode;
  applyHref?: string;
}) {
  return (
    <div className="site-page min-h-screen bg-white text-[var(--oar-ink)]">
      <a
        href={applyHref}
        className="sticky-apply cta-pulse items-center rounded-full bg-[var(--oar-red)] px-5 py-3 text-sm font-medium text-white shadow-lg"
      >
        Apply now
      </a>
      {children}
    </div>
  );
}

export function SiteHeader({
  tone = 'dark',
}: {
  tone?: 'dark' | 'light';
}) {
  const pathname = usePathname();
  const light = tone === 'light';

  return (
    <header
      className={`site-header absolute inset-x-0 top-0 z-20 ${light ? 'is-light' : ''}`}
    >
      <div className="site-topbar flex items-center justify-between gap-3 bg-black/40 px-4 py-2 text-xs text-white/90 backdrop-blur-md md:px-8">
        <p className="min-w-0 truncate">
          <a href="tel:+27114776222" className="hover:text-white">
            011 477 6222
          </a>
          <span className="topbar-email">
            <span className="mx-2 opacity-40">·</span>
            <a href="mailto:sales@ownarental.co.za" className="hover:text-white">
              sales@ownarental.co.za
            </a>
          </span>
        </p>
        <Link
          href="/"
          className="topbar-dash hidden shrink-0 text-[11px] uppercase tracking-[0.14em] text-white/70 transition hover:text-white sm:inline"
        >
          ← Dashboard
        </Link>
      </div>
      <div className="site-nav flex items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Link href="/website" className="shrink-0">
          <Image
            src="/brand/oar-logo.svg"
            alt="ownArental"
            width={220}
            height={44}
            className="site-logo h-9 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] md:h-12"
            priority
          />
        </Link>
        <div className="desktop-nav hidden items-center gap-1 lg:flex">
          {WEBSITE_NAV.map((item) => {
            const active = isActiveNav(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="#contact"
            className="cta-pulse ml-2 rounded-md bg-[var(--oar-red)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#a81420]"
          >
            Apply now
          </Link>
        </div>
        <div className="menu-spacer hidden h-11 w-11 shrink-0" aria-hidden />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-slate-200 bg-white px-4 py-8 pb-24 md:px-8 md:pb-8">
      <div className="footer-row mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Image
          src="/brand/oar-logo.svg"
          alt="ownArental"
          width={160}
          height={32}
          className="h-8 w-auto"
        />
        <nav className="footer-nav flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--oar-navy)]/80">
          {WEBSITE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--oar-red)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-[var(--oar-grey)]">
          © {new Date().getFullYear()} Own A Rental · Giving You Wheels · Demo
        </p>
        <Link href="/" className="text-sm text-[var(--oar-blue)] hover:underline">
          Back to dashboard
        </Link>
      </div>
    </footer>
  );
}

export function QualifySection({
  eyebrow = 'You qualify if you have',
  title = (
    <>
      Stupid-simple
      <span className="text-[var(--oar-red)]"> paperwork</span>
    </>
  ),
}: {
  eyebrow?: string;
  title?: ReactNode;
}) {
  return (
    <section id="apply" className="apply-section px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-blue)] md:text-sm">
            {eyebrow}
          </p>
          <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-6xl">
            {title}
          </h2>
          <p className="section-copy mt-4 max-w-2xl text-base text-[var(--oar-navy)]/75 md:mt-5 md:text-lg">
            Less forms. More driving. Approval is subject to affordability — if
            the monthly works, we can usually make a plan.
          </p>
        </Reveal>

        <ul className="qualify-grid mt-8 grid gap-2 sm:grid-cols-2 md:mt-12 md:gap-3 lg:grid-cols-5">
          {QUALIFY_ITEMS.map((item, index) => (
            <Reveal key={item} delay={index * 70}>
              <li className="qualify-item relative overflow-hidden bg-[var(--oar-mist)] px-4 py-5 md:py-6">
                <span className="font-marketing text-2xl font-bold text-[var(--oar-gold)] md:text-3xl">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--oar-navy)] md:mt-3 md:text-sm">
                  {item}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ContactSection({
  defaultService = 'Rent To Own',
}: {
  defaultService?: 'Long Term Rental' | 'Rent To Own';
}) {  return (
    <section
      id="contact"
      className="contact-section relative overflow-hidden bg-[var(--oar-navy)] px-4 py-16 text-white md:px-8 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(192,23,37,0.25),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(22,128,171,0.25),transparent_42%)]" />
      <div className="contact-grid relative mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:gap-12">
        <Reveal>
          <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-gold)] md:text-sm">
            Still got questions?
          </p>
          <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight md:text-6xl">
            Let&apos;s get
            <br />
            you rolling
          </h2>
          <p className="section-copy mt-4 text-sm text-white/75 md:mt-5 md:text-base">
            Call, email, or drop a message — we&apos;re in Newlands, Randburg and
            ready to talk wheels.
          </p>

          <dl className="mt-8 space-y-5 text-sm md:mt-10 md:space-y-6">
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">Call</dt>
              <dd className="mt-2 font-marketing text-xl font-semibold md:text-2xl">
                <a href="tel:+27114776222" className="hover:text-[var(--oar-gold)]">
                  +27 11 477 6222
                </a>
              </dd>
              <dd className="mt-1 font-marketing text-lg text-white/80 md:text-xl">
                <a href="tel:+27710407799" className="hover:text-[var(--oar-gold)]">
                  +27 71 040 7799
                </a>
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">Email</dt>
              <dd className="mt-2 break-all">
                <a
                  href="mailto:sales@ownarental.co.za"
                  className="text-[var(--oar-gold)] hover:underline"
                >
                  sales@ownarental.co.za
                </a>
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">Find us</dt>
              <dd className="mt-2 text-white/85">
                1 Main Road, Newlands, Randburg, 2092
              </dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={120}>
          <form
            className="contact-form space-y-4 bg-white p-5 text-[var(--oar-ink)] md:p-8"
            action="mailto:sales@ownarental.co.za"
            method="get"
          >
            <p className="font-marketing text-xl font-bold uppercase tracking-wide text-[var(--oar-navy)] md:text-2xl">
              Get in touch today
            </p>
            <div className="form-name-row grid gap-3 sm:grid-cols-2 sm:gap-4">
              <input
                name="name"
                required
                placeholder="Name"
                className="w-full border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--oar-red)]"
              />
              <input
                name="surname"
                required
                placeholder="Surname"
                className="w-full border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--oar-red)]"
              />
            </div>
            <input
              name="email"
              type="email"
              required
              placeholder="Email address"
              className="w-full border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--oar-red)]"
            />
            <input
              name="phone"
              type="tel"
              required
              placeholder="Phone number"
              className="w-full border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--oar-red)]"
            />
            <select
              name="service"
              className="w-full border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--oar-red)]"
              defaultValue={defaultService}
            >
              <option>Long Term Rental</option>
              <option>Rent To Own</option>
            </select>
            <textarea
              name="body"
              rows={4}
              placeholder="Message"
              className="w-full resize-y border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--oar-red)]"
            />
            <button
              type="submit"
              className="cta-pulse w-full bg-[var(--oar-red)] px-4 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#a81420]"
            >
              Send message
            </button>
            <p className="text-xs text-[var(--oar-grey)]">
              Demo form — opens mail to sales@ownarental.co.za
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}


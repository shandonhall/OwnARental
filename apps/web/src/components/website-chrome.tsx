'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Reveal } from '@/components/website-motion';
import {
  CLIENT_QUOTES,
  INSPECTION_CHECKS,
  QUALIFY_ITEMS,
  SITE_CONTACT,
  TRUST_PILLARS,
  WEBSITE_NAV,
} from '@/lib/website-content';

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
      <a href={applyHref} className="sticky-apply btn-primary cta-pulse">
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
    <>
      <header
        className={`site-header absolute inset-x-0 top-0 z-20 ${light ? 'is-light' : ''}`}
      >
        <div className="site-topbar">
          <p className="min-w-0 truncate">
            <a href={`tel:${SITE_CONTACT.phonePrimaryTel}`} className="hover:text-white">
              011 477 6222
            </a>
            <span className="topbar-email">
              <span className="mx-2 opacity-40">·</span>
              <a
                href={`mailto:${SITE_CONTACT.email}`}
                className="hover:text-white"
              >
                {SITE_CONTACT.email}
              </a>
            </span>
          </p>
          <a
            href={SITE_CONTACT.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="topbar-whatsapp"
          >
            WhatsApp
          </a>
        </div>
        <div className="site-nav flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Link href="/website" className="shrink-0">
            <Image
              src="/brand/oar-logo.svg"
              alt="ownArental"
              width={220}
              height={44}
              className="site-logo h-9 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] md:h-11"
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
                  className={`nav-link${active ? ' is-active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <a href="#contact" className="btn-primary btn-primary-sm ml-2 cta-pulse">
              Apply now
            </a>
          </div>
          <div className="menu-spacer hidden h-11 w-11 shrink-0" aria-hidden />
        </div>
      </header>
      <StickyNav />
    </>
  );
}

function StickyNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('.website-root .hero-section');
    if (!(hero instanceof HTMLElement)) {
      setVisible(true);
      return;
    }

    const root =
      hero.closest('.phone-screen') instanceof HTMLElement
        ? (hero.closest('.phone-screen') as HTMLElement)
        : null;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { root, threshold: 0.08, rootMargin: '-8% 0px 0px 0px' },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div
      className={`sticky-nav${visible ? ' is-visible' : ''}`}
      aria-hidden={!visible}
    >
      <div className="sticky-nav-inner">
        <Link href="/website" className="shrink-0">
          <Image
            src="/brand/oar-mark.svg"
            alt="ownArental"
            width={36}
            height={36}
            className="h-8 w-8"
          />
        </Link>
        <nav className="sticky-nav-links" aria-label="Quick links">
          {WEBSITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActiveNav(item.href, pathname) ? 'is-active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <a href="#contact" className="btn-primary btn-primary-sm">
          Apply now
        </a>
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <section className="trust-section bg-[var(--oar-mist)] px-4 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal from="left">
          <p className="section-eyebrow text-[var(--oar-blue)]">
            Why drivers trust us
          </p>
          <h2 className="section-title font-marketing mt-3 text-3xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-5xl">
            Proof over promises
          </h2>
          <p className="section-copy mt-3 max-w-2xl">
            Real process. Real people in Randburg. Approvals are still subject to
            affordability — we just make the path clearer.
          </p>
        </Reveal>

        <div className="trust-grid mt-10 grid gap-3 md:mt-12 md:grid-cols-3 md:gap-4">
          {TRUST_PILLARS.map((pillar, index) => (
            <Reveal
              key={pillar.title}
              delay={index * 90}
              from={index % 2 === 0 ? 'left' : 'right'}
            >
              <article className="trust-card">
                <span className="trust-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-marketing mt-4 text-xl font-bold uppercase text-[var(--oar-navy)]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--oar-navy)]/70">
                  {pillar.copy}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="quote-grid mt-8 grid gap-3 md:mt-10 md:grid-cols-2">
          {CLIENT_QUOTES.map((item, index) => (
            <Reveal
              key={item.name}
              delay={120 + index * 80}
              from={index % 2 === 0 ? 'left' : 'right'}
            >
              <blockquote className="quote-card">
                <p className="quote-text">&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-4">
                  <p className="font-semibold text-[var(--oar-navy)]">{item.name}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--oar-grey)]">
                    {item.detail}
                  </p>
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div>
          <Image
            src="/brand/oar-logo.svg"
            alt="ownArental"
            width={180}
            height={36}
            className="h-9 w-auto"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--oar-navy)]/70">
            Giving you wheels from Newlands, Randburg — long-term rental and
            rent-to-own for drivers who need a second chance on the road.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={SITE_CONTACT.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary btn-secondary-sm"
            >
              WhatsApp us
            </a>
            <a
              href={`tel:${SITE_CONTACT.phonePrimaryTel}`}
              className="btn-ghost btn-ghost-sm"
            >
              Call now
            </a>
          </div>
        </div>

        <div>
          <p className="footer-heading">Visit</p>
          <p className="mt-3 text-sm text-[var(--oar-navy)]/80">
            {SITE_CONTACT.address}
          </p>
          <p className="mt-2 text-sm text-[var(--oar-navy)]/65">
            {SITE_CONTACT.hours}
          </p>
          <a
            href="https://maps.google.com/?q=1+Main+Road+Newlands+Randburg+2092"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--oar-blue)] hover:underline"
          >
            Open in Maps →
          </a>
        </div>

        <div>
          <p className="footer-heading">Explore</p>
          <nav className="footer-nav mt-3 flex flex-col gap-2 text-sm text-[var(--oar-navy)]/80">
            {WEBSITE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-[var(--oar-red)]"
              >
                {item.label}
              </Link>
            ))}
            <a href="#contact" className="hover:text-[var(--oar-red)]">
              Contact
            </a>
            <Link href="/" className="hover:text-[var(--oar-red)]">
              Fleet dashboard
            </Link>
          </nav>
          <div className="footer-contact mt-6 space-y-1 text-sm">
            <a
              href={`mailto:${SITE_CONTACT.email}`}
              className="block text-[var(--oar-navy)]/80 hover:text-[var(--oar-red)]"
            >
              {SITE_CONTACT.email}
            </a>
            <a
              href={`tel:${SITE_CONTACT.phonePrimaryTel}`}
              className="block text-[var(--oar-navy)]/80 hover:text-[var(--oar-red)]"
            >
              {SITE_CONTACT.phonePrimary}
            </a>
          </div>
        </div>
      </div>

      <div className="footer-base mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-[var(--oar-navy)]/10 pt-6 text-xs text-[var(--oar-grey)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Own A Rental · Giving You Wheels · Demo
        </p>
        <p>
          Approvals subject to affordability. Rates exclude extras unless stated.
        </p>
      </div>
    </footer>
  );
}

export function QualifySection({
  eyebrow = 'You qualify if you have',
  title = (
    <>
      Simple paperwork.
      <span className="text-[var(--oar-red)]"> Clear next steps.</span>
    </>
  ),
}: {
  eyebrow?: string;
  title?: ReactNode;
}) {
  return (
    <section
      id="apply"
      className="apply-section relative overflow-hidden bg-white px-4 py-16 md:px-8 md:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[var(--oar-red)]" />
      <div className="mx-auto max-w-6xl">
        <Reveal from="left">
          <p className="section-eyebrow text-[var(--oar-blue)]">{eyebrow}</p>
          <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--oar-navy)] md:text-6xl">
            {title}
          </h2>
          <p className="section-copy mt-4 max-w-2xl md:mt-5">
            Less forms. More driving. Bring what you can — if the monthly works,
            we can usually make a plan. Final approval is always subject to
            affordability checks.
          </p>
        </Reveal>

        <ul className="qualify-grid mt-8 grid gap-2 sm:grid-cols-2 md:mt-12 md:gap-3 lg:grid-cols-5">
          {QUALIFY_ITEMS.map((item, index) => (
            <Reveal
              key={item}
              delay={index * 80}
              from={index % 2 === 0 ? 'left' : 'right'}
            >
              <li className="qualify-item relative overflow-hidden border-l-4 border-[var(--oar-gold)] bg-[var(--oar-mist)] px-4 py-5 md:py-6">
                <span className="font-marketing text-2xl font-bold text-[var(--oar-gold)] md:text-3xl">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 text-sm font-medium text-[var(--oar-navy)] md:mt-3">
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

function ContactForm({
  defaultService,
}: {
  defaultService: 'Long Term Rental' | 'Rent To Own';
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('error');
      return;
    }

    setStatus('sending');
    window.setTimeout(() => {
      setStatus('sent');
    }, 900);
  };

  if (status === 'sent') {
    return (
      <div className="contact-form contact-success" role="status">
        <p className="font-marketing text-2xl font-bold uppercase tracking-wide text-[var(--oar-navy)]">
          Message received
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--oar-navy)]/75">
          Thanks — a consultant typically responds within one business day.
          Prefer faster? Call or WhatsApp us now.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`tel:${SITE_CONTACT.phonePrimaryTel}`}
            className="btn-primary btn-primary-sm"
          >
            Call us
          </a>
          <a
            href={SITE_CONTACT.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary btn-secondary-sm"
          >
            WhatsApp
          </a>
          <button
            type="button"
            className="btn-ghost btn-ghost-sm"
            onClick={() => setStatus('idle')}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <p className="font-marketing text-xl font-bold uppercase tracking-wide text-[var(--oar-navy)] md:text-2xl">
        Get in touch today
      </p>
      <p className="mt-2 text-sm text-[var(--oar-navy)]/65">
        We usually reply within one business day — often sooner.
      </p>

      <div className="form-name-row mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <label className="form-field">
          <span>Name</span>
          <input name="name" required autoComplete="given-name" />
        </label>
        <label className="form-field">
          <span>Surname</span>
          <input name="surname" required autoComplete="family-name" />
        </label>
      </div>
      <label className="form-field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="form-field">
        <span>Phone</span>
        <input name="phone" type="tel" required autoComplete="tel" />
      </label>
      <label className="form-field">
        <span>Service</span>
        <select name="service" defaultValue={defaultService}>
          <option>Long Term Rental</option>
          <option>Rent To Own</option>
        </select>
      </label>
      <label className="form-field">
        <span>Message</span>
        <textarea name="body" rows={4} placeholder="Tell us what you need" />
      </label>

      <button
        type="submit"
        className="btn-primary w-full cta-pulse"
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      {status === 'error' ? (
        <p className="form-note form-note-error">
          Please complete the required fields so we can reach you.
        </p>
      ) : (
        <p className="form-note">
          Demo enquiry — no data is stored. For live help use call, email, or
          WhatsApp.
        </p>
      )}
    </form>
  );
}

export function ContactSection({
  defaultService = 'Rent To Own',
}: {
  defaultService?: 'Long Term Rental' | 'Rent To Own';
}) {
  return (
    <section
      id="contact"
      className="contact-section relative overflow-hidden bg-[var(--oar-navy)] px-4 py-16 text-white md:px-8 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(192,23,37,0.25),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(22,128,171,0.25),transparent_42%)]" />
      <div className="contact-grid relative mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:gap-12">
        <Reveal from="left">
          <p className="section-eyebrow text-[var(--oar-gold)]">
            Still got questions?
          </p>
          <h2 className="section-title font-marketing mt-3 text-4xl font-bold uppercase tracking-tight md:text-6xl">
            Let&apos;s get
            <br />
            you rolling
          </h2>
          <p className="section-copy mt-4 text-white/75">
            Call, email, or drop a message — we&apos;re in Newlands, Randburg and
            ready to talk wheels.
          </p>

          <dl className="mt-8 space-y-5 text-sm md:mt-10 md:space-y-6">
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">Call</dt>
              <dd className="mt-2 font-marketing text-xl font-semibold md:text-2xl">
                <a
                  href={`tel:${SITE_CONTACT.phonePrimaryTel}`}
                  className="hover:text-[var(--oar-gold)]"
                >
                  {SITE_CONTACT.phonePrimary}
                </a>
              </dd>
              <dd className="mt-1 font-marketing text-lg text-white/80 md:text-xl">
                <a
                  href={`tel:${SITE_CONTACT.phoneSecondaryTel}`}
                  className="hover:text-[var(--oar-gold)]"
                >
                  {SITE_CONTACT.phoneSecondary}
                </a>
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">
                WhatsApp
              </dt>
              <dd className="mt-2">
                <a
                  href={SITE_CONTACT.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--oar-gold)] hover:underline"
                >
                  Message us on WhatsApp
                </a>
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">Email</dt>
              <dd className="mt-2 break-all">
                <a
                  href={`mailto:${SITE_CONTACT.email}`}
                  className="text-[var(--oar-gold)] hover:underline"
                >
                  {SITE_CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-white/50">
                Find us
              </dt>
              <dd className="mt-2 text-white/85">{SITE_CONTACT.address}</dd>
              <dd className="mt-1 text-white/55">{SITE_CONTACT.hours}</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={160} from="right">
          <ContactForm defaultService={defaultService} />
        </Reveal>
      </div>
    </section>
  );
}

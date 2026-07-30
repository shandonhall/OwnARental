'use client';

import Image from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  DEAL_VEHICLES,
  RATE_TABLE,
  formatRand,
  type DealVehicle,
} from '@/lib/website-content';

export type RevealFrom = 'up' | 'left' | 'right' | 'fade';

export function Reveal({
  children,
  className = '',
  delay = 0,
  from = 'up',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: RevealFrom;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const direction = className.includes('deal-card-slot') ? 'fade' : from;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Prefer the phone-frame scrollport when previewing mobile on desktop
    const root =
      node.closest('.phone-screen') instanceof Element
        ? (node.closest('.phone-screen') as Element)
        : null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, root, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal reveal-from-${direction} ${visible ? 'reveal-in' : ''} ${className}`}
      style={delay ? ({ transitionDelay: `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function Stagger({
  children,
  className = '',
  staggerMs = 90,
  from = 'up',
  alternate = false,
}: {
  children: ReactNode[];
  className?: string;
  staggerMs?: number;
  from?: RevealFrom;
  alternate?: boolean;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => {
        const dir: RevealFrom = alternate
          ? index % 2 === 0
            ? 'left'
            : 'right'
          : from;
        return (
          <Reveal key={index} delay={index * staggerMs} from={dir}>
            {child}
          </Reveal>
        );
      })}
    </div>
  );
}


export function Marquee({ items }: { items: readonly string[] | string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {loop.map((item, index) => (
          <span key={`${item}-${index}`} className="marquee-item">
            {item}
            <span className="marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function CountUp({
  value,
  className = '',
  prefix = 'R',
  duration = 1100,
}: {
  value: number;
  className?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-ZA')}
    </span>
  );
}

export function RateCalculator() {
  const [cip, setCip] = useState<'cip10' | 'cip20'>('cip10');
  const [index, setIndex] = useState(0);
  const row = RATE_TABLE[cip][index];

  return (
    <div className="rate-calculator">
      <div className="rate-tabs" role="tablist" aria-label="CIP option">
        <button
          type="button"
          role="tab"
          aria-selected={cip === 'cip10'}
          className={cip === 'cip10' ? 'is-active' : ''}
          onClick={() => setCip('cip10')}
        >
          10% CIP
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={cip === 'cip20'}
          className={cip === 'cip20' ? 'is-active' : ''}
          onClick={() => setCip('cip20')}
        >
          20% CIP
        </button>
      </div>

      <label className="rate-slider-label">
        <span>Vehicle price</span>
        <strong>{formatRand(row.price)}</strong>
      </label>
      <input
        type="range"
        className="rate-slider"
        min={0}
        max={RATE_TABLE[cip].length - 1}
        step={1}
        value={index}
        onChange={(event) => setIndex(Number(event.target.value))}
        aria-valuetext={formatRand(row.price)}
      />

      <div className="rate-results">
        <div>
          <p className="rate-kicker">Contract initiation</p>
          <p className="rate-value" key={`cip-${cip}-${index}`}>
            {formatRand(row.cip)}
          </p>
        </div>
        <div>
          <p className="rate-kicker">Est. monthly</p>
          <p className="rate-value rate-value-accent" key={`mo-${cip}-${index}`}>
            {formatRand(row.monthly)}
          </p>
        </div>
      </div>
      <p className="rate-note">
        Demo estimates from the live rate table · insurance, tracker, warranty &amp;
        admin are separate unless stated
      </p>
    </div>
  );
}

function wrapCarouselOffset(offset: number, halfWidth: number) {
  if (halfWidth <= 0) return offset;
  let next = offset;
  while (next <= -halfWidth) next += halfWidth;
  while (next > 0) next -= halfWidth;
  return next;
}

export function KeysTodayBand() {
  const cars = [...DEAL_VEHICLES, ...DEAL_VEHICLES];
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const pressActiveRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pendingDealIdRef = useRef<string | null>(null);
  const pointerStartXRef = useRef(0);
  const pointerStartOffsetRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = media.matches;
    const onMotionChange = () => {
      reduceMotionRef.current = media.matches;
    };
    media.addEventListener('change', onMotionChange);

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2;
      offsetRef.current = wrapCarouselOffset(
        offsetRef.current,
        halfWidthRef.current,
      );
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);

    let frame = 0;
    const tick = () => {
      if (
        !pressActiveRef.current &&
        !draggingRef.current &&
        !reduceMotionRef.current &&
        halfWidthRef.current > 0
      ) {
        offsetRef.current = wrapCarouselOffset(
          offsetRef.current - 0.45,
          halfWidthRef.current,
        );
        track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener('change', onMotionChange);
    };
  }, []);

  const openDeal = (dealId: string) => {
    const hash = `deal-${dealId}`;
    if (window.location.pathname === '/website/deals') {
      if (window.location.hash === `#${hash}`) {
        window.dispatchEvent(new Event('hashchange'));
      } else {
        window.location.hash = hash;
      }
      return;
    }
    // Assign keeps the hash (App Router client pushes often drop it)
    window.location.assign(`/website/deals#${hash}`);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as Element | null;
    const car = target?.closest?.('[data-deal-id]') as HTMLElement | null;

    pressActiveRef.current = true;
    draggingRef.current = false;
    movedRef.current = false;
    pendingDealIdRef.current = car?.dataset.dealId ?? null;
    pointerStartXRef.current = event.clientX;
    pointerStartOffsetRef.current = offsetRef.current;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pressActiveRef.current || !trackRef.current) return;

    const delta = event.clientX - pointerStartXRef.current;
    if (!draggingRef.current && Math.abs(delta) > 10) {
      draggingRef.current = true;
      movedRef.current = true;
      pendingDealIdRef.current = null;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (!draggingRef.current) return;

    offsetRef.current = wrapCarouselOffset(
      pointerStartOffsetRef.current + delta,
      halfWidthRef.current,
    );
    trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pressActiveRef.current) return;

    const dealId = pendingDealIdRef.current;
    const wasDrag = movedRef.current;

    pressActiveRef.current = false;
    draggingRef.current = false;
    pendingDealIdRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!wasDrag && dealId) {
      openDeal(dealId);
    }
  };

  return (
    <section className="keys-band relative overflow-hidden">
      <div className="keys-band-copy relative z-[2] mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-14">
        <Reveal from="left">
          <p className="font-marketing text-xs uppercase tracking-[0.28em] text-[var(--oar-gold)]">
            No waiting list energy
          </p>
          <h2 className="section-title font-marketing mt-2 text-4xl font-bold uppercase leading-[0.92] tracking-tight text-white md:text-6xl">
            Keys as soon
            <span className="block text-[var(--oar-gold)]">as today</span>
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/65">
            Drag to browse · tap a car for full deal details
          </p>
        </Reveal>
        <Reveal delay={120} from="right">
          <a
            href="#contact"
            className="cta-pulse inline-flex items-center justify-center rounded-md bg-white px-5 py-3.5 text-sm font-semibold uppercase tracking-wide text-[var(--oar-navy)] transition hover:bg-[var(--oar-gold)]"
          >
            Talk to us now
          </a>
        </Reveal>
      </div>

      <div
        className={`keys-band-viewport${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={trackRef} className="keys-band-track">
          {cars.map((car, index) => (
            <button
              key={`${car.id}-${index}`}
              type="button"
              data-deal-id={car.id}
              className="keys-band-car"
              aria-label={`View ${car.name} deal details`}
            >
              <Image
                src={car.image}
                alt=""
                width={320}
                height={200}
                className="h-28 w-auto object-contain md:h-36"
                draggable={false}
              />
              <span className="keys-band-car-label">{car.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="keys-band-road" aria-hidden />
    </section>
  );
}

export function DealHashFocus() {
  useEffect(() => {
    let clearTimer = 0;
    let retryTimer = 0;
    let attempts = 0;

    const focusDeal = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash.startsWith('deal-')) return;

      window.clearTimeout(clearTimer);
      window.clearTimeout(retryTimer);
      document
        .querySelectorAll('.deal-card.is-deal-focused')
        .forEach((node) => node.classList.remove('is-deal-focused'));

      const target = document.getElementById(hash);
      if (!target) {
        if (attempts < 12) {
          attempts += 1;
          retryTimer = window.setTimeout(focusDeal, 120);
        }
        return;
      }

      attempts = 0;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('is-deal-focused');
      clearTimer = window.setTimeout(() => {
        target.classList.remove('is-deal-focused');
      }, 2600);
    };

    const startTimer = window.setTimeout(focusDeal, 120);
    window.addEventListener('hashchange', focusDeal);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(clearTimer);
      window.clearTimeout(retryTimer);
      window.removeEventListener('hashchange', focusDeal);
    };
  }, []);

  return null;
}

export function DealCard({
  deal,
  index,
}: {
  deal: DealVehicle;
  index: number;
}) {
  return (
    <Reveal
      className="deal-card-slot"
      delay={(index % 3) * 90}
      from={index % 2 === 0 ? 'left' : 'right'}
    >
      <article
        id={`deal-${deal.id}`}
        className="deal-card group"
        style={{ ['--deal-accent' as string]: deal.accent }}
      >
        <div className="deal-card-media">
          <div className="deal-card-spotlight" aria-hidden />
          <div className="deal-card-photo-wrap">
            <Image
              src={deal.image}
              alt={deal.name}
              width={640}
              height={500}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="deal-card-photo"
              style={{ animationDelay: `${(index % 5) * 0.7}s` }}
            />
            <div className="deal-card-reflection" aria-hidden />
          </div>
          <span className="deal-year">{deal.year}</span>
          <span className="deal-ready-chip">Ready now</span>
        </div>
        <div className="deal-card-body">
          <div className="deal-card-platform" aria-hidden />
          <p className="deal-price">{formatRand(deal.price)}</p>
          <h3 className="deal-name">{deal.name}</h3>
          <dl className="deal-meta">
            <div>
              <dt>Km</dt>
              <dd>{deal.km}</dd>
            </div>
            <div>
              <dt>Colour</dt>
              <dd>{deal.colour}</dd>
            </div>
            <div>
              <dt>20% CIP</dt>
              <dd>{formatRand(deal.cip20)}</dd>
            </div>
          </dl>
          <div className="deal-monthly">
            <span>Monthly installment*</span>
            <strong>{formatRand(deal.monthly)}</strong>
          </div>
          <a href="#contact" className="deal-cta">
            Enquire <span aria-hidden>→</span>
          </a>
        </div>
      </article>
    </Reveal>
  );
}

'use client';

import Image from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  RATE_TABLE,
  formatRand,
  type DealVehicle,
} from '@/lib/website-content';

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className.includes('deal-card-slot') ? 'reveal-fade' : ''} ${visible ? 'reveal-in' : ''} ${className}`}
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
}: {
  children: ReactNode[];
  className?: string;
  staggerMs?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Reveal key={index} delay={index * staggerMs}>
          {child}
        </Reveal>
      ))}
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

export function DealCard({
  deal,
  index,
}: {
  deal: DealVehicle;
  index: number;
}) {
  return (
    <Reveal className="deal-card-slot" delay={(index % 3) * 80}>
      <article
        className="deal-card group"
        style={{ ['--deal-accent' as string]: deal.accent }}
      >
        <div className="deal-card-media">
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
          </div>
          <span className="deal-year">{deal.year}</span>
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

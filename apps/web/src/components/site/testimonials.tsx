import { SITE_INDEXABLE } from '@/lib/site/site-config';
import { TESTIMONIALS } from '@/lib/site/site-content';
import { QuoteIcon } from './icons';
import { SectionHeading } from './section-heading';

export function Testimonials() {
  const items = TESTIMONIALS.filter(
    (item) => !item.isPlaceholder || !SITE_INDEXABLE,
  );
  if (items.length === 0) return null;

  return (
    <section className="site-section bg-white" aria-labelledby="testimonials-heading">
      <div className="site-container">
        <div id="testimonials-heading">
          <SectionHeading
            eyebrow="Testimonials"
            title="What our customers say"
            align="center"
          />
        </div>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={index}
              className={`relative flex h-full flex-col rounded-xl border bg-[var(--oar-mist)] p-6 ${
                item.isPlaceholder ? 'border-dashed border-slate-300' : 'border-transparent'
              }`}
            >
              {item.isPlaceholder ? (
                <span className="absolute top-3 right-3 rounded bg-white px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Placeholder
                </span>
              ) : null}
              <QuoteIcon className="h-8 w-8 text-[var(--oar-red)]" />
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-[var(--oar-navy)]">
                {item.quote}
              </blockquote>
              <footer className="mt-6 border-t border-slate-200 pt-4">
                <p className="font-semibold text-[var(--oar-navy)]">{item.name}</p>
                <p className="text-sm text-[var(--oar-grey)]">{item.detail}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

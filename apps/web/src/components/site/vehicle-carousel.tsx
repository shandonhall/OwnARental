'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebsiteVehicle } from '@/lib/site/vehicles';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { VehicleCard } from './vehicle-card';

/** Horizontally swipeable row of vehicle cards. Phones show one card with the next one peeking in. */
export function VehicleCarousel({ vehicles, label }: { vehicles: WebsiteVehicle[]; label: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateButtons = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setCanPrev(list.scrollLeft > 4);
    setCanNext(list.scrollLeft + list.clientWidth < list.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    updateButtons();
    list.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    return () => {
      list.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, [updateButtons]);

  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    const first = list?.firstElementChild as HTMLElement | null;
    if (!list || !first) return;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const step = first.offsetWidth + gap;
    const perPage = Math.max(1, Math.floor((list.clientWidth + gap) / step));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollBy({ left: direction * step * perPage, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const showButtons = canPrev || canNext;

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={listRef}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-1 pb-3 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:gap-5 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {vehicles.map((vehicle) => (
          <li
            key={vehicle.slug}
            className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)]"
          >
            <VehicleCard vehicle={vehicle} />
          </li>
        ))}
      </ul>

      {showButtons ? (
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--oar-grey)] sm:hidden">Swipe to see more</p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              disabled={!canPrev}
              aria-label="Previous vehicles"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-[var(--oar-navy)] shadow-sm transition-colors hover:border-[var(--oar-navy)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-300"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              disabled={!canNext}
              aria-label="Next vehicles"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-[var(--oar-navy)] shadow-sm transition-colors hover:border-[var(--oar-navy)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-300"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { VehiclePhoto } from '@/lib/site/vehicles';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

export function VehicleGallery({ photos, title }: { photos: VehiclePhoto[]; title: string }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = photos.length;
  const current = photos[index];
  const multiple = count > 1;

  function go(delta: number) {
    setIndex((value) => (value + delta + count) % count);
  }

  if (!current) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-[var(--oar-mist)] text-[var(--oar-grey)] sm:aspect-[3/2]">
        Photos coming soon
      </div>
    );
  }

  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-white sm:aspect-[3/2]"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
        tabIndex={multiple ? 0 : undefined}
        onKeyDown={(event) => {
          if (!multiple) return;
          if (event.key === 'ArrowLeft') go(-1);
          if (event.key === 'ArrowRight') go(1);
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          const end = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (!multiple || start == null || end == null) return;
          if (Math.abs(end - start) > 40) go(end < start ? 1 : -1);
        }}
      >
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-contain p-3 sm:p-5"
        />
        {multiple ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--oar-navy)] shadow hover:bg-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--oar-navy)] shadow hover:bg-white"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-[var(--oar-navy)]/80 px-2.5 py-1 text-xs font-medium text-white">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {multiple ? (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((photo, photoIndex) => (
            <li key={photo.src}>
              <button
                type="button"
                onClick={() => setIndex(photoIndex)}
                aria-label={`Show photo ${photoIndex + 1}`}
                aria-current={photoIndex === index ? 'true' : undefined}
                className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg border-2 bg-white ${
                  photoIndex === index ? 'border-[var(--oar-red)]' : 'border-transparent hover:border-slate-300'
                }`}
              >
                <Image src={photo.src} alt="" fill sizes="120px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

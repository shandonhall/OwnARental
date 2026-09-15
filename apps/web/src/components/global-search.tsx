'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { api, type GlobalSearchResult } from '@/lib/api';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function ResultGroup({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: GlobalSearchResult[];
  onSelect: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.16em] text-brand-grey">
        {label}
      </p>
      <ul>
        {items.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <Link
              href={item.href}
              onClick={onSelect}
              className="block px-3 py-2 transition hover:bg-mist"
            >
              <p className="text-sm text-navy">{item.title}</p>
              <p className="text-xs text-brand-grey">{item.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 250);

  const search = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => api.globalSearch(debounced),
    enabled: debounced.length >= 2,
  });

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const clients = search.data?.clients ?? [];
  const vehicles = search.data?.vehicles ?? [];
  const contracts = search.data?.contracts ?? [];
  const leads = search.data?.leads ?? [];
  const total = clients.length + vehicles.length + contracts.length + leads.length;
  const showPanel = open && debounced.length >= 2;

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Search clients, vehicles, contracts
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === 'Enter' && vehicles[0]) {
            event.preventDefault();
            setOpen(false);
            router.push(vehicles[0].href);
          }
        }}
        placeholder="Search clients, leads, reg, VIN, ID…"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none ring-brand/30 placeholder:text-brand-grey focus:border-brand focus:ring-2"
        autoComplete="off"
      />

      {showPanel ? (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {search.isFetching ? (
            <p className="px-3 py-3 text-sm text-brand-grey">Searching…</p>
          ) : null}
          {search.isError ? (
            <p className="px-3 py-3 text-sm text-danger">Search failed</p>
          ) : null}
          {!search.isFetching && !search.isError && total === 0 ? (
            <p className="px-3 py-3 text-sm text-brand-grey">
              No matches for “{debounced}”
            </p>
          ) : null}
          <ResultGroup
            label="Clients"
            items={clients}
            onSelect={() => setOpen(false)}
          />
          <ResultGroup
            label="Leads"
            items={leads}
            onSelect={() => setOpen(false)}
          />
          <ResultGroup
            label="Vehicles"
            items={vehicles}
            onSelect={() => setOpen(false)}
          />
          <ResultGroup
            label="Contracts"
            items={contracts}
            onSelect={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

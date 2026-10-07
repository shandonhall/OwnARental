'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { VEHICLE_PAGE_SIZE as PAGE_SIZE, formatRand, type WebsiteVehicle } from '@/lib/site/vehicles';
import { SearchIcon } from './icons';
import { VehicleCard } from './vehicle-card';

type SortKey = 'featured' | 'monthly-asc' | 'monthly-desc' | 'year-desc';

function distinct(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))].sort();
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-[var(--oar-navy)]">
      {label}
      <select
        className="site-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function VehicleBrowser({ vehicles }: { vehicles: WebsiteVehicle[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const make = params.get('make') ?? '';
  const maxMonthly = params.get('max') ?? '';
  const minYear = params.get('year') ?? '';
  const transmission = params.get('transmission') ?? '';
  const fuel = params.get('fuel') ?? '';
  const availability = params.get('availability') ?? '';
  const sort = (params.get('sort') as SortKey | null) ?? 'featured';

  const options = useMemo(() => {
    const monthlies = vehicles
      .map((vehicle) => vehicle.monthlyRental)
      .filter((value): value is number => value != null);
    const priceSteps: number[] = [];
    if (monthlies.length > 1) {
      const low = Math.ceil(Math.min(...monthlies) / 1000) * 1000;
      const high = Math.ceil(Math.max(...monthlies) / 1000) * 1000;
      for (let step = low; step <= high; step += 1000) priceSteps.push(step);
    }
    return {
      makes: distinct(vehicles.map((vehicle) => vehicle.make)),
      years: [...new Set(vehicles.map((vehicle) => vehicle.year))].sort((a, b) => b - a),
      transmissions: distinct(vehicles.map((vehicle) => vehicle.transmission)),
      fuels: distinct(vehicles.map((vehicle) => vehicle.fuelType)),
      availabilities: [...new Set(vehicles.map((vehicle) => vehicle.availability))],
      priceSteps,
    };
  }, [vehicles]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    setVisible(PAGE_SIZE);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = vehicles.filter((vehicle) => {
      if (needle) {
        const haystack = [
          vehicle.year,
          vehicle.make,
          vehicle.model,
          vehicle.variant,
          vehicle.colour,
          vehicle.bodyType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!needle.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      if (make && vehicle.make !== make) return false;
      if (minYear && vehicle.year < Number(minYear)) return false;
      if (maxMonthly && (vehicle.monthlyRental == null || vehicle.monthlyRental > Number(maxMonthly)))
        return false;
      if (transmission && vehicle.transmission !== transmission) return false;
      if (fuel && vehicle.fuelType !== fuel) return false;
      if (availability && vehicle.availability !== availability) return false;
      return true;
    });
    const byMonthly = (vehicle: WebsiteVehicle, missing: number) =>
      vehicle.monthlyRental ?? missing;
    if (sort === 'monthly-asc')
      return [...filtered].sort((a, b) => byMonthly(a, Infinity) - byMonthly(b, Infinity));
    if (sort === 'monthly-desc')
      return [...filtered].sort((a, b) => byMonthly(b, -Infinity) - byMonthly(a, -Infinity));
    if (sort === 'year-desc') return [...filtered].sort((a, b) => b.year - a.year);
    return filtered;
  }, [vehicles, query, make, minYear, maxMonthly, transmission, fuel, availability, sort]);

  const hasFilters =
    !!query || !!make || !!minYear || !!maxMonthly || !!transmission || !!fuel || !!availability;

  function clearAll() {
    setQuery('');
    setVisible(PAGE_SIZE);
    router.replace(pathname, { scroll: false });
  }

  return (
    <div>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setParam('q', query.trim());
        }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <label className="relative block">
          <span className="sr-only">Search vehicles</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setParam('q', query.trim())}
            placeholder="Search make or model, e.g. Polo"
            className="site-input pl-11"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Select label="Make" value={make} onChange={(value) => setParam('make', value)}>
            <option value="">All makes</option>
            {options.makes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {options.priceSteps.length > 1 ? (
            <Select label="Max monthly" value={maxMonthly} onChange={(value) => setParam('max', value)}>
              <option value="">Any</option>
              {options.priceSteps.map((value) => (
                <option key={value} value={value}>
                  Up to {formatRand(value)}
                </option>
              ))}
            </Select>
          ) : null}
          <Select label="Year from" value={minYear} onChange={(value) => setParam('year', value)}>
            <option value="">Any year</option>
            {options.years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {options.transmissions.length > 1 ? (
            <Select
              label="Transmission"
              value={transmission}
              onChange={(value) => setParam('transmission', value)}
            >
              <option value="">Any</option>
              {options.transmissions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          ) : null}
          {options.fuels.length > 1 ? (
            <Select label="Fuel" value={fuel} onChange={(value) => setParam('fuel', value)}>
              <option value="">Any</option>
              {options.fuels.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          ) : null}
          {options.availabilities.length > 1 ? (
            <Select
              label="Availability"
              value={availability}
              onChange={(value) => setParam('availability', value)}
            >
              <option value="">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
            </Select>
          ) : null}
          <Select label="Sort by" value={sort} onChange={(value) => setParam('sort', value === 'featured' ? '' : value)}>
            <option value="featured">Recommended</option>
            <option value="monthly-asc">Monthly: low to high</option>
            <option value="monthly-desc">Monthly: high to low</option>
            <option value="year-desc">Year: newest first</option>
          </Select>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4" aria-live="polite">
        <p className="text-sm text-[var(--oar-grey)]">
          {results.length === 1 ? '1 vehicle' : `${results.length} vehicles`}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold text-[var(--oar-red)] hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {results.length ? (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.slice(0, visible).map((vehicle, index) => (
            <li key={vehicle.slug}>
              <VehicleCard vehicle={vehicle} priority={index < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="site-display text-2xl font-bold text-[var(--oar-navy)]">No vehicles match</p>
          <p className="mt-2 text-[var(--oar-grey)]">Try fewer filters, or ask us what is coming in.</p>
          <button type="button" onClick={clearAll} className="site-btn site-btn-outline mt-5">
            Clear filters
          </button>
        </div>
      )}

      {results.length > visible ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="site-btn site-btn-outline site-btn-lg"
          >
            Load more vehicles
          </button>
        </div>
      ) : null}
    </div>
  );
}

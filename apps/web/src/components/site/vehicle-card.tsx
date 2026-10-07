import Image from 'next/image';
import Link from 'next/link';
import { sitePath, whatsappLink } from '@/lib/site/site-config';
import {
  AVAILABILITY_LABEL,
  formatKm,
  formatRand,
  vehicleTitle,
  type VehicleAvailability,
  type WebsiteVehicle,
} from '@/lib/site/vehicles';
import { FuelIcon, GaugeIcon, GearIcon, WhatsAppIcon } from './icons';

const BADGE_TONE: Record<VehicleAvailability, string> = {
  AVAILABLE: 'bg-emerald-600 text-white',
  RESERVED: 'bg-[var(--oar-gold)] text-[var(--oar-ink)]',
  UNAVAILABLE: 'bg-slate-500 text-white',
};

export function AvailabilityBadge({ status }: { status: VehicleAvailability }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONE[status]}`}
    >
      {AVAILABILITY_LABEL[status]}
    </span>
  );
}

export function VehicleCard({
  vehicle,
  priority = false,
}: {
  vehicle: WebsiteVehicle;
  priority?: boolean;
}) {
  const title = vehicleTitle(vehicle);
  const href = sitePath(`/vehicles/${vehicle.slug}`);
  const photo = vehicle.photos[0];
  const specs = [
    vehicle.mileageKm != null
      ? { key: 'km', icon: GaugeIcon, label: formatKm(vehicle.mileageKm) }
      : null,
    vehicle.transmission
      ? { key: 'gear', icon: GearIcon, label: vehicle.transmission }
      : null,
    vehicle.fuelType
      ? { key: 'fuel', icon: FuelIcon, label: vehicle.fuelType }
      : null,
  ].filter((spec) => spec !== null);
  const secondaryPrices = [
    vehicle.cip != null
      ? `CIP ${formatRand(vehicle.cip)}${vehicle.cipPercent ? ` (${vehicle.cipPercent}%)` : ''}`
      : null,
    vehicle.cashPrice != null ? `Vehicle price ${formatRand(vehicle.cashPrice)}` : null,
  ].filter((line) => line !== null);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="relative block aspect-[4/3] bg-white" tabIndex={-1} aria-hidden="true">
        {photo ? (
          <Image
            src={photo.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-contain p-4"
          />
        ) : null}
        <span className="absolute top-3 left-3">
          <AvailabilityBadge status={vehicle.availability} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col border-t border-slate-100 p-5">
        <h3 className="site-display truncate text-xl font-bold text-[var(--oar-navy)]">
          <Link href={href} className="hover:text-[var(--oar-red)]">
            {title}
          </Link>
        </h3>
        <p className="mt-0.5 h-5 truncate text-sm text-[var(--oar-grey)]">
          {vehicle.variant ?? ''}
        </p>

        <ul className="mt-3 flex min-h-7 flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--oar-navy)]">
          {specs.map(({ key, icon: Icon, label }) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-[var(--oar-blue)]" />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          {vehicle.monthlyRental != null ? (
            <p className="text-[var(--oar-navy)]">
              <span className="site-display text-3xl font-bold text-[var(--oar-red)]">
                {formatRand(vehicle.monthlyRental)}
              </span>
              <span className="text-sm text-[var(--oar-grey)]"> p/m*</span>
            </p>
          ) : (
            <p className="site-display text-xl font-semibold text-[var(--oar-navy)]">
              Enquire for pricing
            </p>
          )}
          <p className="mt-1 min-h-5 text-xs text-[var(--oar-grey)]">
            {secondaryPrices.join(' · ')}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={href} className="site-btn site-btn-outline min-w-0 px-2">
            View vehicle
          </Link>
          <Link
            href={sitePath(`/apply?vehicle=${vehicle.slug}`)}
            className="site-btn site-btn-primary min-w-0 px-2"
          >
            Apply
          </Link>
        </div>
        <a
          href={whatsappLink(`Hi Own A Rental, I'm interested in the ${title}.`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enquire about the ${title} on WhatsApp`}
          className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[#128c4a] hover:bg-emerald-50"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Enquire on WhatsApp
        </a>
      </div>
    </article>
  );
}

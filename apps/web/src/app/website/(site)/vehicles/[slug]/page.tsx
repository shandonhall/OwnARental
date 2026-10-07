import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CalendarIcon,
  CarIcon,
  ChevronRightIcon,
  FuelIcon,
  GaugeIcon,
  GearIcon,
  PaletteIcon,
  PhoneIcon,
  WhatsAppIcon,
} from '@/components/site/icons';
import { JsonLd } from '@/components/site/json-ld';
import { RequirementsList } from '@/components/site/requirements-list';
import { AvailabilityBadge, VehicleCard } from '@/components/site/vehicle-card';
import { VehicleGallery } from '@/components/site/vehicle-gallery';
import {
  SITE_CONTACT,
  canonicalUrl,
  sitePath,
  whatsappLink,
} from '@/lib/site/site-config';
import { PRICING_DISCLAIMER, REQUIREMENTS } from '@/lib/site/site-content';
import {
  formatKm,
  formatRand,
  getVehicleBySlug,
  getWebsiteVehicles,
  vehicleTitle,
} from '@/lib/site/vehicles';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const vehicles = await getWebsiteVehicles();
  return vehicles.map((vehicle) => ({ slug: vehicle.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: 'Vehicle not found' };
  const title = vehicleTitle(vehicle);
  const details = [
    vehicle.variant,
    vehicle.mileageKm != null ? formatKm(vehicle.mileageKm) : null,
    vehicle.monthlyRental != null ? `${formatRand(vehicle.monthlyRental)} p/m*` : null,
  ]
    .filter(Boolean)
    .join(', ');
  return {
    title: `${title}${vehicle.variant ? ` ${vehicle.variant}` : ''}`,
    description: `${title} available for long-term rental from Own A Rental in Randburg${details ? ` — ${details}` : ''}. Apply online or enquire on WhatsApp.`,
    alternates: { canonical: canonicalUrl(`/vehicles/${vehicle.slug}`) },
    openGraph: vehicle.photos[0] ? { images: [{ url: vehicle.photos[0].src }] } : undefined,
  };
}

export default async function VehicleDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const title = vehicleTitle(vehicle);
  const fullTitle = `${title}${vehicle.variant ? ` ${vehicle.variant}` : ''}`;
  const applyHref = sitePath(`/apply?vehicle=${vehicle.slug}`);
  const enquiry = whatsappLink(`Hi Own A Rental, I'm interested in the ${fullTitle}.`);

  const specs = [
    { label: 'Make', value: vehicle.make, icon: CarIcon },
    { label: 'Model', value: vehicle.model, icon: CarIcon },
    { label: 'Year', value: String(vehicle.year), icon: CalendarIcon },
    {
      label: 'Mileage',
      value: vehicle.mileageKm != null ? formatKm(vehicle.mileageKm) : undefined,
      icon: GaugeIcon,
    },
    { label: 'Transmission', value: vehicle.transmission, icon: GearIcon },
    { label: 'Fuel', value: vehicle.fuelType, icon: FuelIcon },
    { label: 'Body type', value: vehicle.bodyType, icon: CarIcon },
    { label: 'Colour', value: vehicle.colour, icon: PaletteIcon },
  ].filter((spec): spec is typeof spec & { value: string } => !!spec.value);

  const others = (await getWebsiteVehicles())
    .filter((item) => item.slug !== vehicle.slug && item.availability !== 'UNAVAILABLE')
    .slice(0, 4);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: fullTitle,
          brand: { '@type': 'Brand', name: vehicle.make },
          model: vehicle.model,
          vehicleModelDate: String(vehicle.year),
          ...(vehicle.mileageKm != null
            ? {
                mileageFromOdometer: {
                  '@type': 'QuantitativeValue',
                  value: vehicle.mileageKm,
                  unitCode: 'KMT',
                },
              }
            : {}),
          ...(vehicle.colour ? { color: vehicle.colour } : {}),
          ...(vehicle.transmission ? { vehicleTransmission: vehicle.transmission } : {}),
          ...(vehicle.fuelType ? { fuelType: vehicle.fuelType } : {}),
          ...(vehicle.bodyType ? { bodyType: vehicle.bodyType } : {}),
          image: vehicle.photos.map((photo) => canonicalUrl(photo.src)),
          url: canonicalUrl(`/vehicles/${vehicle.slug}`),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
            { '@type': 'ListItem', position: 2, name: 'Vehicles', item: canonicalUrl('/vehicles') },
            {
              '@type': 'ListItem',
              position: 3,
              name: fullTitle,
              item: canonicalUrl(`/vehicles/${vehicle.slug}`),
            },
          ],
        }}
      />

      <div className="bg-white">
        <div className="site-container py-5 sm:py-7">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--oar-grey)]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li className="flex items-center gap-1.5">
                <Link href={sitePath('/')} className="hover:text-[var(--oar-red)]">
                  Home
                </Link>
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </li>
              <li className="flex items-center gap-1.5">
                <Link href={sitePath('/vehicles')} className="hover:text-[var(--oar-red)]">
                  Vehicles
                </Link>
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </li>
              <li aria-current="page" className="truncate text-[var(--oar-navy)]">
                {title}
              </li>
            </ol>
          </nav>

          {/* Phones: photo, price, details, requirements. Desktop: details stack under the photo. */}
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
            <div className="contents lg:flex lg:flex-col lg:gap-8">
              <div className="order-1">
                <VehicleGallery photos={vehicle.photos} title={fullTitle} />
              </div>

              <section aria-labelledby="specs-heading" className="order-3">
                <h2 id="specs-heading" className="site-h2 !text-3xl">
                  Vehicle details
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {specs.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--oar-blue)]" />
                      <div className="min-w-0">
                        <dt className="text-xs font-medium tracking-wide text-[var(--oar-grey)] uppercase">
                          {label}
                        </dt>
                        <dd className="mt-0.5 font-semibold break-words text-[var(--oar-navy)]">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-[var(--oar-grey)]">{PRICING_DISCLAIMER}</p>
              </section>
            </div>

            <div className="contents lg:flex lg:flex-col lg:gap-8">
              <div className="order-2">
                <AvailabilityBadge status={vehicle.availability} />
                <h1 className="site-display mt-2 text-3xl leading-tight font-bold text-[var(--oar-navy)] sm:text-4xl">
                  {title}
                </h1>
                {vehicle.variant ? (
                  <p className="mt-0.5 text-[var(--oar-grey)]">{vehicle.variant}</p>
                ) : null}

                <div className="mt-4 rounded-xl bg-[var(--oar-mist)] p-5">
                  {vehicle.monthlyRental != null ? (
                    <>
                      <p className="text-sm font-medium text-[var(--oar-grey)]">Monthly rental</p>
                      <p className="mt-1">
                        <span className="site-display text-5xl font-bold text-[var(--oar-red)]">
                          {formatRand(vehicle.monthlyRental)}
                        </span>
                        <span className="text-[var(--oar-grey)]"> p/m*</span>
                      </p>
                    </>
                  ) : (
                    <p className="site-display text-2xl font-bold text-[var(--oar-navy)]">
                      Enquire for pricing
                    </p>
                  )}
                  {vehicle.cip != null || vehicle.cashPrice != null ? (
                    <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm">
                      {vehicle.cip != null ? (
                        <div>
                          <dt className="text-[var(--oar-grey)]">
                            Contract Initiation Payment (CIP)
                            {vehicle.cipPercent ? ` · ${vehicle.cipPercent}%` : ''}
                          </dt>
                          <dd className="mt-0.5 text-lg font-semibold text-[var(--oar-navy)]">
                            {formatRand(vehicle.cip)}
                          </dd>
                        </div>
                      ) : null}
                      {vehicle.cashPrice != null ? (
                        <div>
                          <dt className="text-[var(--oar-grey)]">Vehicle price</dt>
                          <dd className="mt-0.5 text-lg font-semibold text-[var(--oar-navy)]">
                            {formatRand(vehicle.cashPrice)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link href={applyHref} className="site-btn site-btn-primary site-btn-lg">
                    Apply Now
                  </Link>
                  <Link href={`${applyHref}#qualify`} className="site-btn site-btn-outline site-btn-lg">
                    See If You Qualify
                  </Link>
                  <a
                    href={enquiry}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-btn site-btn-whatsapp site-btn-lg sm:col-span-2"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    Enquire on WhatsApp
                  </a>
                </div>
                <a
                  href={`tel:${SITE_CONTACT.phonePrimaryTel}`}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--oar-navy)] hover:text-[var(--oar-red)]"
                >
                  <PhoneIcon className="h-4 w-4" />
                  Or call {SITE_CONTACT.phonePrimaryDisplay}
                </a>
              </div>

              <section aria-labelledby="qualify-heading" className="order-4 rounded-xl bg-[var(--oar-navy)] p-6 sm:p-8">
                <h2 id="qualify-heading" className="site-display text-2xl font-bold text-white">
                  {REQUIREMENTS.heading}
                </h2>
                <div className="mt-5">
                  <RequirementsList tone="light" />
                </div>
                <Link href={applyHref} className="site-btn site-btn-primary site-btn-lg mt-6 w-full">
                  Apply for this vehicle
                </Link>
              </section>
            </div>
          </div>
        </div>
      </div>

      {others.length ? (
        <section className="site-section bg-[var(--oar-mist)]" aria-labelledby="more-vehicles">
          <div className="site-container">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="more-vehicles" className="site-h2">
                More vehicles
              </h2>
              <Link href={sitePath('/vehicles')} className="site-btn site-btn-outline self-start sm:self-auto">
                View all vehicles
              </Link>
            </div>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {others.map((item) => (
                <li key={item.slug}>
                  <VehicleCard vehicle={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

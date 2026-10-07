import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FinalCta } from '@/components/site/final-cta';
import { WhatsAppIcon } from '@/components/site/icons';
import { SectionHeading } from '@/components/site/section-heading';
import { VehicleBrowser } from '@/components/site/vehicle-browser';
import { VehicleCard } from '@/components/site/vehicle-card';
import { canonicalUrl, whatsappLink } from '@/lib/site/site-config';
import { PRICING_DISCLAIMER } from '@/lib/site/site-content';
import { VEHICLE_PAGE_SIZE, getWebsiteVehicles, type WebsiteVehicle } from '@/lib/site/vehicles';

export const metadata: Metadata = {
  title: 'Vehicles available for long-term rental',
  description:
    'Browse pre-owned vehicles available for long-term rental from Own A Rental in Randburg. Compare monthly rentals and apply online.',
  alternates: { canonical: canonicalUrl('/vehicles') },
};

export default async function VehiclesPage() {
  const vehicles = await getWebsiteVehicles();

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="site-container flex flex-col gap-5 py-10 sm:py-12 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            as="h1"
            eyebrow="Vehicles"
            title="Vehicles available for long-term rental"
            intro="Find a vehicle that suits your budget, then apply online or ask us on WhatsApp."
          />
          <a
            href={whatsappLink('Hi Own A Rental, can you help me find a vehicle?')}
            target="_blank"
            rel="noopener noreferrer"
            className="site-btn site-btn-whatsapp site-btn-lg shrink-0 self-start md:self-auto"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Help me choose
          </a>
        </div>
      </section>

      <section className="bg-[var(--oar-mist)] py-8 sm:py-12">
        <div className="site-container">
          <Suspense fallback={<VehicleGridFallback vehicles={vehicles} />}>
            <VehicleBrowser vehicles={vehicles} />
          </Suspense>
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-[var(--oar-grey)]">
            {PRICING_DISCLAIMER}
          </p>
        </div>
      </section>

      <FinalCta
        title="Can't find the right vehicle?"
        copy="Send an application and tell us what you are looking for. Our team will let you know what is available."
      />
    </>
  );
}

/** Server-rendered grid shown until the filters hydrate, so the listing is in the initial HTML. */
function VehicleGridFallback({ vehicles }: { vehicles: WebsiteVehicle[] }) {
  const shown = vehicles.slice(0, VEHICLE_PAGE_SIZE);
  return (
    <div>
      <div className="h-[13.5rem] rounded-xl border border-slate-200 bg-white md:h-[11rem] lg:h-[7.5rem]" />
      <p className="mt-6 text-sm text-[var(--oar-grey)]">
        {vehicles.length === 1 ? '1 vehicle' : `${vehicles.length} vehicles`}
      </p>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((vehicle, index) => (
          <li key={vehicle.slug}>
            <VehicleCard vehicle={vehicle} priority={index < 2} />
          </li>
        ))}
      </ul>
    </div>
  );
}

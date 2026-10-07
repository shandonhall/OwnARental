import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ApplyForm } from '@/components/site/apply-form';
import { PhoneIcon, WhatsAppIcon } from '@/components/site/icons';
import { RequirementsList } from '@/components/site/requirements-list';
import { SectionHeading } from '@/components/site/section-heading';
import {
  SITE_CONTACT,
  canonicalUrl,
  sitePath,
  whatsappLink,
} from '@/lib/site/site-config';
import { REQUIREMENTS } from '@/lib/site/site-content';
import {
  formatRand,
  getVehicleBySlug,
  getWebsiteVehicles,
  vehicleTitle,
} from '@/lib/site/vehicles';

export const metadata: Metadata = {
  title: 'Apply for long-term vehicle rental',
  description:
    'Send a short application to Own A Rental. Our Randburg team will contact you about long-term vehicle rental and the documents you need.',
  alternates: { canonical: canonicalUrl('/apply') },
};

type SearchParams = Promise<{ vehicle?: string | string[] }>;

export default async function ApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const { vehicle: vehicleParam } = await searchParams;
  const slug = Array.isArray(vehicleParam) ? vehicleParam[0] : vehicleParam;
  const [vehicles, selected] = await Promise.all([
    getWebsiteVehicles(),
    slug ? getVehicleBySlug(slug) : Promise.resolve(null),
  ]);
  const options = vehicles
    .filter((vehicle) => vehicle.availability !== 'UNAVAILABLE' || vehicle.slug === selected?.slug)
    .map((vehicle) => ({
      slug: vehicle.slug,
      label: `${vehicleTitle(vehicle)}${vehicle.variant ? ` ${vehicle.variant}` : ''}`,
    }));

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="site-container py-10 sm:py-12">
          <SectionHeading
            as="h1"
            eyebrow="Apply / Do I qualify?"
            title="Apply for long-term vehicle rental"
            intro="Tell us a little about yourself. It takes about two minutes and there are no documents to upload now."
          />
        </div>
      </section>

      <section className="bg-[var(--oar-mist)] py-10 sm:py-14">
        <div className="site-container grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
            {selected ? (
              <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 p-3">
                <div className="relative aspect-[4/3] w-24 shrink-0 bg-white">
                  {selected.photos[0] ? (
                    <Image src={selected.photos[0].src} alt="" fill sizes="96px" className="object-contain" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-[var(--oar-grey)] uppercase">
                    Applying for
                  </p>
                  <p className="site-display truncate text-xl font-bold text-[var(--oar-navy)]">
                    {vehicleTitle(selected)}
                  </p>
                  {selected.monthlyRental != null ? (
                    <p className="text-sm text-[var(--oar-grey)]">
                      {formatRand(selected.monthlyRental)} p/m*
                    </p>
                  ) : null}
                </div>
                <Link
                  href={sitePath(`/vehicles/${selected.slug}`)}
                  className="ml-auto hidden shrink-0 py-3 text-sm font-semibold text-[var(--oar-red)] hover:underline sm:block"
                >
                  View vehicle
                </Link>
              </div>
            ) : null}
            <ApplyForm vehicles={options} initialVehicle={selected?.slug} />
          </div>

          <aside className="space-y-6">
            <section id="qualify" className="scroll-mt-28 rounded-2xl bg-[var(--oar-navy)] p-6 sm:p-8">
              <h2 className="site-display text-2xl font-bold text-white">{REQUIREMENTS.heading}</h2>
              <p className="mt-2 text-sm text-slate-300">
                You do not need these to apply. Our team will ask for them afterwards.
              </p>
              <div className="mt-5">
                <RequirementsList tone="light" />
              </div>
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="site-display text-2xl font-bold text-[var(--oar-navy)]">Rather talk to us?</h2>
              <div className="mt-4 flex flex-col gap-3">
                <a
                  href={whatsappLink('Hi Own A Rental, I would like to apply.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-btn site-btn-whatsapp site-btn-lg"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  WhatsApp {SITE_CONTACT.phoneSecondaryDisplay}
                </a>
                <a href={`tel:${SITE_CONTACT.phonePrimaryTel}`} className="site-btn site-btn-outline site-btn-lg">
                  <PhoneIcon className="h-5 w-5" />
                  Call {SITE_CONTACT.phonePrimaryDisplay}
                </a>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </>
  );
}

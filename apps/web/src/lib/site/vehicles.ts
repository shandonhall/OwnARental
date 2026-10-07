/**
 * Public website vehicle catalogue.
 *
 * Data lives in this file for now. Pages only call the loader functions below,
 * so moving the catalogue to the database later only changes this module.
 *
 * Every optional field is omitted from the UI when missing — never fill gaps
 * with guessed specifications.
 */

export type VehicleAvailability = 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE';

export type VehiclePhoto = {
  src: string;
  alt: string;
};

export type WebsiteVehicle = {
  slug: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  mileageKm?: number;
  transmission?: string;
  fuelType?: string;
  bodyType?: string;
  colour?: string;
  monthlyRental?: number;
  cip?: number;
  cipPercent?: number;
  cashPrice?: number;
  availability: VehicleAvailability;
  featured?: boolean;
  /** First photo is the primary image. Layout supports roughly 12 per vehicle. */
  photos: VehiclePhoto[];
  /** Layout-review stock carried over from the pitch demo, not confirmed as current. */
  isPlaceholder: boolean;
};

type VehicleInput = Omit<WebsiteVehicle, 'slug' | 'photos'> & {
  photo: string;
};

function slugify(...parts: Array<string | number | undefined>): string {
  return parts
    .filter((part) => part !== undefined && part !== '')
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function build(input: VehicleInput): WebsiteVehicle {
  const { photo, ...rest } = input;
  return {
    ...rest,
    slug: slugify(rest.year, rest.make, rest.model, rest.variant),
    photos: [
      {
        src: photo,
        alt: `${rest.year} ${rest.make} ${rest.model}${rest.variant ? ` ${rest.variant}` : ''}${rest.colour ? ` in ${rest.colour.toLowerCase()}` : ''}`,
      },
    ],
  };
}

const VEHICLES: WebsiteVehicle[] = [
  build({
    make: 'Volkswagen',
    model: 'Polo Vivo',
    variant: '1.4 Trend',
    year: 2013,
    mileageKm: 173000,
    colour: 'White',
    cashPrice: 109900,
    cip: 22000,
    cipPercent: 20,
    monthlyRental: 5800,
    availability: 'AVAILABLE',
    featured: true,
    isPlaceholder: true,
    photo: '/brand/deals/car-6.webp',
  }),
  build({
    make: 'Ford',
    model: 'Fiesta',
    variant: '1.4 Trend',
    year: 2012,
    mileageKm: 125000,
    colour: 'Maroon',
    cashPrice: 109900,
    cip: 22000,
    cipPercent: 20,
    monthlyRental: 5800,
    availability: 'AVAILABLE',
    featured: true,
    isPlaceholder: true,
    photo: '/brand/deals/car-3.webp',
  }),
  build({
    make: 'Toyota',
    model: 'Corolla',
    variant: '1.3 Prof',
    year: 2009,
    mileageKm: 175000,
    colour: 'White',
    cashPrice: 109900,
    cip: 22000,
    cipPercent: 20,
    monthlyRental: 5800,
    availability: 'AVAILABLE',
    featured: true,
    isPlaceholder: true,
    photo: '/brand/deals/car-10.webp',
  }),
  build({
    make: 'Nissan',
    model: 'Qashqai',
    variant: '2.0 Ntec Ltd',
    year: 2012,
    mileageKm: 158000,
    colour: 'White',
    cashPrice: 139900,
    cip: 28000,
    cipPercent: 20,
    monthlyRental: 6950,
    availability: 'AVAILABLE',
    featured: true,
    isPlaceholder: true,
    photo: '/brand/deals/car-7.webp',
  }),
  build({
    make: 'Chevrolet',
    model: 'Spark',
    variant: '1.2L 5DR',
    year: 2016,
    mileageKm: 112000,
    colour: 'White',
    cashPrice: 99900,
    cip: 20000,
    cipPercent: 20,
    monthlyRental: 5417,
    availability: 'AVAILABLE',
    isPlaceholder: true,
    photo: '/brand/deals/car-8.webp',
  }),
  build({
    make: 'Honda',
    model: 'Brio',
    variant: '1.2 Comfort',
    year: 2015,
    mileageKm: 152000,
    colour: 'Bronze',
    cashPrice: 89900,
    cip: 20000,
    cipPercent: 20,
    monthlyRental: 5035,
    availability: 'AVAILABLE',
    isPlaceholder: true,
    photo: '/brand/deals/car-9.webp',
  }),
  build({
    make: 'Chevrolet',
    model: 'Spark',
    variant: '1.2L 5DR',
    year: 2012,
    mileageKm: 79000,
    colour: 'White',
    cashPrice: 89900,
    cip: 18000,
    cipPercent: 20,
    monthlyRental: 5035,
    availability: 'AVAILABLE',
    isPlaceholder: true,
    photo: '/brand/deals/car-5.webp',
  }),
  build({
    make: 'Suzuki',
    model: 'SX4',
    variant: '2.0',
    year: 2011,
    mileageKm: 135000,
    colour: 'Orange',
    cashPrice: 114900,
    cip: 23000,
    cipPercent: 20,
    monthlyRental: 5990,
    availability: 'AVAILABLE',
    isPlaceholder: true,
    photo: '/brand/deals/car-2.webp',
  }),
  build({
    make: 'Mercedes-Benz',
    model: 'CLS350',
    year: 2005,
    mileageKm: 144000,
    colour: 'Black',
    cashPrice: 139900,
    cip: 28000,
    cipPercent: 20,
    monthlyRental: 6950,
    availability: 'AVAILABLE',
    isPlaceholder: true,
    photo: '/brand/deals/car-4.webp',
  }),
  build({
    make: 'Nissan',
    model: 'Almera',
    year: 2006,
    mileageKm: 203000,
    colour: 'White',
    cashPrice: 69900,
    cip: 14000,
    cipPercent: 20,
    monthlyRental: 4270,
    availability: 'AVAILABLE',
    isPlaceholder: true,
    photo: '/brand/deals/car-1.webp',
  }),
];

/** Cards shown per "page" on /vehicles before "Load more". */
export const VEHICLE_PAGE_SIZE = 12;

export async function getWebsiteVehicles(): Promise<WebsiteVehicle[]> {
  return VEHICLES;
}

/** Featured vehicles first, then the rest of the available stock. */
export async function getFeaturedVehicles(limit = 8): Promise<WebsiteVehicle[]> {
  const available = VEHICLES.filter((vehicle) => vehicle.availability !== 'UNAVAILABLE');
  return [
    ...available.filter((vehicle) => vehicle.featured),
    ...available.filter((vehicle) => !vehicle.featured),
  ].slice(0, limit);
}

export async function getVehicleBySlug(
  slug: string,
): Promise<WebsiteVehicle | null> {
  return VEHICLES.find((vehicle) => vehicle.slug === slug) ?? null;
}

export function vehicleTitle(vehicle: WebsiteVehicle): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

export function formatRand(value: number): string {
  return `R${value.toLocaleString('en-ZA')}`;
}

export function formatKm(value: number): string {
  return `${value.toLocaleString('en-ZA')} km`;
}

export const AVAILABILITY_LABEL: Record<VehicleAvailability, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  UNAVAILABLE: 'Unavailable',
};

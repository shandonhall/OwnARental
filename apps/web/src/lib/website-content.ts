export const QUALIFY_ITEMS = [
  '6 months payslips',
  '6 months bank statements',
  'Proof of residence',
  'ID document or ID card',
  'Valid driver’s licence',
] as const;

export const WEBSITE_NAV = [
  { href: '/website', label: 'Home' },
  { href: '/website/monthly', label: 'Monthly rental' },
  { href: '/website/rent-to-own', label: 'Rent to own' },
  { href: '/website/deals', label: 'Deals' },
] as const;

export const HOME_TICKER = [
  'ITC listed? Let’s roll',
  'Bank said no — we say drive',
  '100% approvals*',
  'Keys as soon as today',
  'Rent to own',
  'Long-term rental',
  'Giving you wheels',
] as const;

export const MONTHLY_TICKER = [
  '1–12 month terms',
  '2,500 km free / month',
  'Insurance handled',
  'Maintenance covered',
  'Swap after a year',
  'Zero hassle driving',
] as const;

export const RTO_TICKER = [
  'No credit history? Cool',
  'ITC listed? Still good',
  'First-time buyer? Welcome',
  'Every payment builds ownership',
  'Your ride. Your rules.',
  'Pre-loved, not pre-judged',
] as const;

export const DEALS_TICKER = [
  'Dealer’s choice',
  'ITC listed welcome',
  'Bank declined? Drive anyway',
  '20% CIP options',
  'Inspected & ready',
  'Randburg based',
] as const;

export type DealVehicle = {
  id: string;
  name: string;
  price: number;
  year: number;
  km: string;
  colour: string;
  cip20: number;
  monthly: number;
  accent: string;
  image: string;
};

export const DEAL_VEHICLES: DealVehicle[] = [
  {
    id: 'almera',
    name: 'Nissan Almera',
    price: 69900,
    year: 2006,
    km: '203,000 km',
    colour: 'White',
    cip20: 14000,
    monthly: 4270,
    accent: '#1680ab',
    image: '/brand/deals/car-1.webp',
  },
  {
    id: 'sx4',
    name: 'Suzuki SX4 2.0',
    price: 114900,
    year: 2011,
    km: '135,000 km',
    colour: 'Orange',
    cip20: 23000,
    monthly: 5990,
    accent: '#e07a2f',
    image: '/brand/deals/car-2.webp',
  },
  {
    id: 'fiesta',
    name: 'Ford Fiesta 1.4 Trend',
    price: 109900,
    year: 2012,
    km: '125,000 km',
    colour: 'Maroon',
    cip20: 22000,
    monthly: 5800,
    accent: '#8b1e3f',
    image: '/brand/deals/car-3.webp',
  },
  {
    id: 'cls350',
    name: 'Merc CLS350',
    price: 139900,
    year: 2005,
    km: '144,000 km',
    colour: 'Black',
    cip20: 28000,
    monthly: 6950,
    accent: '#1a2832',
    image: '/brand/deals/car-4.webp',
  },
  {
    id: 'spark-12',
    name: 'Chev Spark 1.2L 5DR',
    price: 89900,
    year: 2012,
    km: '79,000 km',
    colour: 'White',
    cip20: 18000,
    monthly: 5035,
    accent: '#c01725',
    image: '/brand/deals/car-5.webp',
  },
  {
    id: 'polo',
    name: 'VW Polo Vivo 1.4 Trend',
    price: 109900,
    year: 2013,
    km: '173,000 km',
    colour: 'White',
    cip20: 22000,
    monthly: 5800,
    accent: '#1680ab',
    image: '/brand/deals/car-6.webp',
  },
  {
    id: 'qashqai',
    name: 'Nissan Qashqai 2.0 Ntec Ltd',
    price: 139900,
    year: 2012,
    km: '158,000 km',
    colour: 'White',
    cip20: 28000,
    monthly: 6950,
    accent: '#1a2832',
    image: '/brand/deals/car-7.webp',
  },
  {
    id: 'spark-16',
    name: 'Chev Spark 1.2L 5DR',
    price: 99900,
    year: 2016,
    km: '112,000 km',
    colour: 'White',
    cip20: 20000,
    monthly: 5417,
    accent: '#eab024',
    image: '/brand/deals/car-8.webp',
  },
  {
    id: 'brio',
    name: 'Honda Brio 1.2 Comfort',
    price: 89900,
    year: 2015,
    km: '152,000 km',
    colour: 'Bronze',
    cip20: 20000,
    monthly: 5035,
    accent: '#a67c52',
    image: '/brand/deals/car-9.webp',
  },
  {
    id: 'corolla',
    name: 'Toyota Corolla 1.3 Prof',
    price: 109900,
    year: 2009,
    km: '175,000 km',
    colour: 'White',
    cip20: 22000,
    monthly: 5800,
    accent: '#c01725',
    image: '/brand/deals/car-10.webp',
  },
];

/** Estimated monthly from live CIP tables (vehicle price → monthly). */
export const RATE_TABLE = {
  cip10: [
    { price: 80000, cip: 8000, monthly: 4426 },
    { price: 90000, cip: 9000, monthly: 4835 },
    { price: 100000, cip: 10000, monthly: 5244 },
    { price: 110000, cip: 11000, monthly: 5652 },
    { price: 120000, cip: 12000, monthly: 6061 },
    { price: 130000, cip: 13000, monthly: 6469 },
    { price: 140000, cip: 14000, monthly: 6878 },
    { price: 150000, cip: 15000, monthly: 7287 },
    { price: 160000, cip: 16000, monthly: 7695 },
    { price: 170000, cip: 17000, monthly: 8104 },
    { price: 180000, cip: 18000, monthly: 8512 },
    { price: 190000, cip: 19000, monthly: 8921 },
    { price: 200000, cip: 20000, monthly: 9330 },
  ],
  cip20: [
    { price: 80000, cip: 16000, monthly: 4107 },
    { price: 90000, cip: 18000, monthly: 4476 },
    { price: 100000, cip: 20000, monthly: 4845 },
    { price: 110000, cip: 22000, monthly: 5214 },
    { price: 120000, cip: 24000, monthly: 5582 },
    { price: 130000, cip: 26000, monthly: 5951 },
    { price: 140000, cip: 28000, monthly: 6320 },
    { price: 150000, cip: 30000, monthly: 6689 },
    { price: 160000, cip: 32000, monthly: 7058 },
    { price: 170000, cip: 34000, monthly: 7426 },
    { price: 180000, cip: 36000, monthly: 7795 },
    { price: 190000, cip: 38000, monthly: 8164 },
    { price: 200000, cip: 40000, monthly: 8533 },
  ],
} as const;

export const RENTAL_INCLUDES = [
  'Comprehensive insurance',
  'Maintenance cover',
  'Roadside assistance',
  'Vehicle tracking',
  '2,500 km free / month',
] as const;

export const RENTAL_EXCLUDES = [
  'Fuel',
  'Traffic fines',
  'Excess km charges',
  'Negligence / gravel damage',
  'Tyres, rims & glass (per policy)',
] as const;

export const TRUST_PILLARS = [
  {
    title: 'Dealer trusted',
    copy: 'Chosen by dealerships who need a reliable partner for restricted clients.',
  },
  {
    title: 'Inspected stock',
    copy: 'Roadworthy checks, tracking fitted, and condition logged before handover.',
  },
  {
    title: 'Clear monthlys',
    copy: 'Know the number upfront — CIP, instalments, and what’s included.',
  },
] as const;

export const INSPECTION_CHECKS = [
  'Mechanical & roadworthy check',
  'Interior & exterior condition report',
  'Tracker installed & tested',
  'Insurance & warranty options confirmed',
] as const;

export const CLIENT_QUOTES = [
  {
    quote:
      'Bank said no. Own A Rental said bring your payslips. I was driving the same week.',
    name: 'Thabo M.',
    detail: 'Rent to own · Randburg',
  },
  {
    quote:
      'No judgment, no runaround — just a clear monthly and keys in hand.',
    name: 'Lebo K.',
    detail: 'Long-term rental · Johannesburg',
  },
] as const;

export const SITE_CONTACT = {
  phonePrimary: '+27 11 477 6222',
  phonePrimaryTel: '+27114776222',
  phoneSecondary: '+27 71 040 7799',
  phoneSecondaryTel: '+27710407799',
  email: 'sales@ownarental.co.za',
  whatsapp: 'https://wa.me/27710407799',
  address: '1 Main Road, Newlands, Randburg, 2092',
  hours: 'Mon–Fri 08:00–17:00 · Sat by appointment',
} as const;

export function formatRand(value: number): string {
  return `R${value.toLocaleString('en-ZA')}`;
}

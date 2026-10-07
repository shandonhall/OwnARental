/**
 * Public website copy.
 *
 * PLACEHOLDER COPY: headings and short descriptions here are neutral wording
 * pending Clifford's approval. Use "Long-Term Vehicle Rental" terminology only;
 * do not describe the service as rent-to-own / rent-to-buy, and do not call the
 * CIP a deposit.
 *
 * The requirements list and 2,500 km allowance are taken from the live
 * ownarental.co.za site (supplied by Own A Rental).
 */

export const HERO = {
  eyebrow: 'Long-term vehicle rental · Randburg',
  heading: 'Long-term vehicle rental, made simple.',
  copy: 'Choose a vehicle, apply online, and our team will guide you through every step to collecting your keys.',
} as const;

export const WHAT_WE_DO = {
  heading: 'What Own A Rental does',
  copy: 'We rent pre-owned vehicles to drivers on a monthly basis under a Long-Term Vehicle Rental Agreement.',
  items: [
    {
      icon: 'car',
      title: 'Long-term vehicle rental',
      copy: 'Drive one of our vehicles for a monthly rental, under a clear rental agreement.',
    },
    {
      icon: 'key',
      title: 'Pre-owned vehicles',
      copy: 'Choose from our current range of pre-owned vehicles in different sizes and budgets.',
    },
    {
      icon: 'pin',
      title: 'A local team',
      copy: 'Deal with real people at our office in Newlands, Randburg.',
    },
  ],
} as const;

export const HOW_IT_WORKS = [
  {
    title: 'Choose a vehicle',
    copy: 'Browse our available vehicles and pick one that suits your budget.',
  },
  {
    title: 'Apply online',
    copy: 'Send a short application. It only takes a few minutes.',
  },
  {
    title: 'Send your documents',
    copy: 'Our team contacts you and asks for the documents listed on this site.',
  },
  {
    title: 'Pay the CIP and drive',
    copy: 'Once approved, pay the Contract Initiation Payment (CIP), sign your rental agreement and collect your vehicle.',
  },
] as const;

export const BENEFITS = [
  {
    icon: 'receipt',
    title: 'Know your numbers upfront',
    copy: 'Your monthly rental and CIP are confirmed with you before you sign.',
  },
  {
    icon: 'file',
    title: 'A short application',
    copy: 'Apply online in a few minutes. No long forms upfront.',
  },
  {
    icon: 'gauge',
    title: '2,500 km per month',
    copy: 'Monthly rental rates include 2,500 km per month.',
  },
  {
    icon: 'chat',
    title: 'Easy to reach',
    copy: 'Call, email or WhatsApp our Randburg team.',
  },
] as const;

export const REQUIREMENTS = {
  heading: 'What you need to apply',
  items: [
    '6 months payslips',
    '6 months bank statements',
    'Proof of residence',
    'ID document or ID card',
    'Valid driver’s licence',
  ],
  note: '*Approval subject to affordability.',
} as const;

export const PRICING_DISCLAIMER =
  '*Estimated monthly rental amount only. Final pricing, the Contract Initiation Payment (CIP) and what is included are confirmed with you before you sign. Images are for illustration purposes and may not be an exact representation.';

export type Testimonial = {
  quote: string;
  name: string;
  detail: string;
  isPlaceholder: boolean;
};

/**
 * PLACEHOLDERS ONLY — not real customers. Replace with approved testimonials
 * (with customer consent) and set isPlaceholder to false. Placeholders are only
 * rendered on staging; the section hides on the live site until real ones exist.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Approved customer testimonial goes here. Two or three sentences about their experience with Own A Rental.',
    name: 'Customer name',
    detail: 'Area · Month 2026',
    isPlaceholder: true,
  },
  {
    quote:
      'Approved customer testimonial goes here. Keep it short, specific and in the customer’s own words.',
    name: 'Customer name',
    detail: 'Area · Month 2026',
    isPlaceholder: true,
  },
  {
    quote:
      'Approved customer testimonial goes here. Only publish with the customer’s written consent.',
    name: 'Customer name',
    detail: 'Area · Month 2026',
    isPlaceholder: true,
  },
];

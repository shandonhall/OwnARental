import type { Metadata } from 'next';
import Link from 'next/link';
import { FinalCta } from '@/components/site/final-cta';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { RequirementsList } from '@/components/site/requirements-list';
import { SectionHeading } from '@/components/site/section-heading';
import { canonicalUrl, sitePath } from '@/lib/site/site-config';
import { REQUIREMENTS } from '@/lib/site/site-content';

export const metadata: Metadata = {
  title: 'How long-term vehicle rental works',
  description:
    'How long-term vehicle rental with Own A Rental works: choose a vehicle, apply online, send your documents, pay the CIP and collect your vehicle.',
  alternates: { canonical: canonicalUrl('/how-it-works') },
};

const FAQS = [
  {
    question: 'What is the CIP?',
    answer:
      'The Contract Initiation Payment (CIP) is the amount paid at the start of your rental agreement. The exact amount for your vehicle is confirmed with you before you sign.',
  },
  {
    question: 'Who owns the vehicle?',
    answer:
      'The vehicle remains owned by Own A Rental. Under the Long-Term Vehicle Rental Agreement you have the use and possession of the vehicle for the term of the agreement.',
  },
  {
    question: 'Do I need my documents to apply?',
    answer:
      'No. Send the short application first. Our team will contact you and ask for the documents listed on this page.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="site-container py-10 sm:py-14">
          <SectionHeading
            as="h1"
            eyebrow="How it works"
            title="How long-term vehicle rental works"
            intro="Four steps from choosing a vehicle to collecting your keys."
          />
        </div>
      </section>

      <section className="site-section bg-white !pt-10">
        <div className="site-container">
          <HowItWorksSteps />
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={sitePath('/apply')} className="site-btn site-btn-primary site-btn-lg">
              Apply Now
            </Link>
            <Link href={sitePath('/vehicles')} className="site-btn site-btn-outline site-btn-lg">
              Browse Vehicles
            </Link>
          </div>
        </div>
      </section>

      <section id="requirements" className="site-section scroll-mt-20 bg-[var(--oar-mist)]">
        <div className="site-container grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Do I qualify?"
              title={REQUIREMENTS.heading}
              intro="Have these ready once our team contacts you."
            />
            <div className="mt-8">
              <RequirementsList />
            </div>
          </div>
          <div>
            <h2 className="site-h2">Common questions</h2>
            <dl className="mt-6 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-xl bg-white p-5 shadow-sm">
                  <dt className="site-display text-xl font-bold text-[var(--oar-navy)]">{faq.question}</dt>
                  <dd className="mt-2 leading-relaxed text-[var(--oar-grey)]">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

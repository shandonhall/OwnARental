import type { Metadata } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './website.css';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-marketing',
});

const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Own A Rental | Giving You Wheels',
  description:
    'Long-term rental and rent-to-own for ITC-listed, bank-declined, and first-time buyers in Randburg.',
};

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${body.variable} website-root`}>
      {children}
    </div>
  );
}

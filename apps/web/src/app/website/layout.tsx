import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import './website.css';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-marketing',
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
    <div className={`${display.variable} website-root`}>{children}</div>
  );
}

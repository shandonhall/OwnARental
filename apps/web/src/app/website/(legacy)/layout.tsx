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

/** Original pitch-demo pages, kept reachable until the redesign is approved. */
export default function LegacyWebsiteLayout({
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

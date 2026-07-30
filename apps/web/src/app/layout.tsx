import type { Metadata } from 'next';
import { Varela } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const body = Varela({
  variable: '--font-body',
  subsets: ['latin'],
  weight: '400',
});

const display = Varela({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Own A Rental | Fleet Dashboard',
  description: 'Fleet and client management for Own A Rental',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${body.variable} ${display.variable} ${body.className} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

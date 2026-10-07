'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  SITE_CONTACT,
  SITE_NAV,
  sitePath,
  whatsappLink,
} from '@/lib/site/site-config';
import { CloseIcon, MenuIcon, PhoneIcon, WhatsAppIcon } from './icons';

function isActive(pathname: string, path: string) {
  const href = sitePath(path);
  if (path === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="site-container flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link href={sitePath('/')} className="shrink-0" aria-label="Own A Rental home">
          <Image
            src="/brand/oar-logo.svg"
            alt="Own A Rental"
            width={202}
            height={40}
            priority
            className="h-8 w-auto lg:h-10"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {SITE_NAV.map((item) => {
            const active = isActive(pathname, item.path);
            return (
              <Link
                key={item.path}
                href={sitePath(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  active
                    ? 'text-[var(--oar-red)]'
                    : 'text-[var(--oar-navy)] hover:text-[var(--oar-red)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="site-btn site-btn-whatsapp hidden sm:inline-flex"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>
          <Link href={sitePath('/apply')} className="site-btn site-btn-primary hidden lg:inline-flex">
            Apply Now
          </Link>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366] text-white sm:hidden"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--oar-navy)] hover:bg-slate-100 lg:hidden"
          >
            {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="site-mobile-menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-slate-200 bg-white lg:hidden"
        >
          <nav aria-label="Mobile" className="site-container flex flex-col py-4">
            {SITE_NAV.map((item) => {
              const active = isActive(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  href={sitePath(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`border-b border-slate-100 py-4 text-lg font-medium ${
                    active ? 'text-[var(--oar-red)]' : 'text-[var(--oar-navy)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="site-container flex flex-col gap-3 pb-8">
            <Link href={sitePath('/apply')} className="site-btn site-btn-primary site-btn-lg w-full">
              Apply Now
            </Link>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="site-btn site-btn-whatsapp site-btn-lg w-full"
            >
              <WhatsAppIcon className="h-5 w-5" />
              WhatsApp us
            </a>
            <a
              href={`tel:${SITE_CONTACT.phonePrimaryTel}`}
              className="site-btn site-btn-outline site-btn-lg w-full"
            >
              <PhoneIcon className="h-5 w-5" />
              Call {SITE_CONTACT.phonePrimaryDisplay}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { WEBSITE_NAV } from '@/lib/website-content';

type Device = 'desktop' | 'mobile';

export function WebsiteShell({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [nativeMobile, setNativeMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      setNativeMobile(media.matches);
      if (media.matches) setDevice('mobile');
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.websiteDevice = device;
    return () => {
      delete document.documentElement.dataset.websiteDevice;
    };
  }, [device]);

  useEffect(() => {
    setMenuOpen(false);
  }, [device]);

  const usePhoneFrame = device === 'mobile' && !nativeMobile;
  const compact = device === 'mobile';

  return (
    <div
      className={`website-shell device-${device}${compact ? ' is-compact' : ''}`}
    >
      {!nativeMobile ? (
        <div className="device-toggle" role="group" aria-label="Preview device">
          <button
            type="button"
            className={device === 'desktop' ? 'is-active' : ''}
            onClick={() => setDevice('desktop')}
          >
            Desktop
          </button>
          <button
            type="button"
            className={device === 'mobile' ? 'is-active' : ''}
            onClick={() => setDevice('mobile')}
          >
            Mobile
          </button>
        </div>
      ) : null}

      {usePhoneFrame ? (
        <div className="device-stage">
          <p className="device-stage-label">
            Mobile preview · most visitor traffic lands here
          </p>
          <div className="phone-frame">
            <div className="phone-notch" aria-hidden />
            <div className="phone-screen">
              <div className="website-compact">
                <MobileMenu
                  open={menuOpen}
                  onToggle={() => setMenuOpen((value) => !value)}
                  onClose={() => setMenuOpen(false)}
                />
                {children}
              </div>
            </div>
            <div className="phone-home" aria-hidden />
          </div>
        </div>
      ) : (
        <div className={`desktop-stage${compact ? ' website-compact' : ''}`}>
          <MobileMenu
            open={menuOpen}
            onToggle={() => setMenuOpen((value) => !value)}
            onClose={() => setMenuOpen(false)}
          />
          {children}
        </div>
      )}
    </div>
  );
}

function MobileMenu({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="mobile-menu-btn"
        aria-expanded={open}
        aria-controls="website-mobile-nav"
        onClick={onToggle}
      >
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <span className={`burger ${open ? 'is-open' : ''}`} aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>

      {open ? (
        <div
          id="website-mobile-nav"
          className="mobile-nav-panel"
          role="dialog"
          aria-label="Site menu"
        >
          <nav className="mobile-nav-links">
            {WEBSITE_NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={onClose}>
                {item.label}
              </Link>
            ))}
            <a href="#contact" onClick={onClose}>
              Contact
            </a>
            <a href="tel:+27114776222" onClick={onClose}>
              Call us
            </a>
            <Link href="/" onClick={onClose}>
              Fleet dashboard
            </Link>
          </nav>
          <a href="#contact" className="mobile-nav-cta" onClick={onClose}>
            Apply now
          </a>
        </div>
      ) : null}
    </>
  );
}

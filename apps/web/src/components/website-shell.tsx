'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { WEBSITE_NAV } from '@/lib/website-content';

type Device = 'desktop' | 'mobile';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getScrollContainer(target: HTMLElement): HTMLElement | Window {
  const phone = target.closest('.phone-screen');
  return phone instanceof HTMLElement ? phone : window;
}

function readScrollTop(container: HTMLElement | Window) {
  if (!(container instanceof HTMLElement)) return window.scrollY;
  return container.scrollTop;
}

function writeScrollTop(container: HTMLElement | Window, value: number) {
  if (!(container instanceof HTMLElement)) {
    window.scrollTo(0, value);
    return;
  }
  container.scrollTop = value;
}

function smoothScrollToTarget(target: HTMLElement, durationMs = 900) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = getScrollContainer(target);
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 24;

  let destination: number;
  if (!(container instanceof HTMLElement)) {
    destination = Math.max(
      0,
      target.getBoundingClientRect().top + window.scrollY - margin,
    );
  } else {
    const box = container.getBoundingClientRect();
    destination = Math.max(
      0,
      target.getBoundingClientRect().top - box.top + container.scrollTop - margin,
    );
  }

  if (reduceMotion || durationMs <= 0) {
    writeScrollTop(container, destination);
    return;
  }

  const start = readScrollTop(container);
  const delta = destination - start;
  if (Math.abs(delta) < 2) return;

  const startedAt = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    writeScrollTop(container, start + delta * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function useSmoothHashLinks() {
  useEffect(() => {
    const root = document.querySelector('.website-root');
    if (!(root instanceof HTMLElement)) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!(link instanceof HTMLAnchorElement) || !root.contains(link)) return;

      const href = link.getAttribute('href');
      if (!href || href === '#' || href.includes('/')) return;

      const id = decodeURIComponent(href.slice(1));
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;

      event.preventDefault();

      const fromMobileNav = Boolean(link.closest('.mobile-nav-panel'));
      const run = () => smoothScrollToTarget(target, fromMobileNav ? 1000 : 900);
      if (fromMobileNav) {
        window.setTimeout(run, 80);
      } else {
        run();
      }

      if (history.replaceState) {
        history.replaceState(null, '', href);
      } else {
        window.location.hash = href;
      }
    };

    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, []);
}

const CURSOR_GLOW_ZONE =
  '.hero-section, .options-section, .keys-band, .contact-section, .split-band, .preloved-section, .calculator-section';

function useCursorGlow() {
  useEffect(() => {
    const root = document.querySelector('.website-root');
    if (!(root instanceof HTMLElement)) return;

    const finePointer = window.matchMedia('(pointer: fine)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active: HTMLElement | null = null;
    let frame = 0;
    let pendingX = 0;
    let pendingY = 0;
    let hasPending = false;

    const clearActive = () => {
      if (!active) return;
      active.style.setProperty('--glow-opacity', '0');
      active = null;
    };

    const enabled = () => finePointer.matches && !reduceMotion.matches;

    const flush = () => {
      frame = 0;
      if (!hasPending || !active) return;
      hasPending = false;
      const rect = active.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((pendingX - rect.left) / rect.width) * 100;
      const y = ((pendingY - rect.top) / rect.height) * 100;
      active.style.setProperty('--glow-x', `${x}%`);
      active.style.setProperty('--glow-y', `${y}%`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!enabled()) {
        clearActive();
        return;
      }

      const zone = (event.target as Element | null)?.closest?.(CURSOR_GLOW_ZONE);
      if (!(zone instanceof HTMLElement) || !root.contains(zone)) {
        clearActive();
        return;
      }

      if (active && active !== zone) {
        active.style.setProperty('--glow-opacity', '0');
      }
      active = zone;
      active.classList.add('has-cursor-glow');
      active.style.setProperty('--glow-opacity', '1');
      pendingX = event.clientX;
      pendingY = event.clientY;
      hasPending = true;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (event.target === root) clearActive();
    };

    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave);
    return () => {
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      if (frame) cancelAnimationFrame(frame);
      clearActive();
      root.querySelectorAll('.has-cursor-glow').forEach((node) => {
        if (node instanceof HTMLElement) {
          node.classList.remove('has-cursor-glow');
          node.style.removeProperty('--glow-x');
          node.style.removeProperty('--glow-y');
          node.style.removeProperty('--glow-opacity');
        }
      });
    };
  }, []);
}

export function WebsiteShell({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [nativeMobile, setNativeMobile] = useState(false);

  useSmoothHashLinks();
  useCursorGlow();

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
          <span className="device-toggle-label">Preview</span>
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
          <a href="#contact" className="btn-primary mobile-nav-cta" onClick={onClose}>
            Apply now
          </a>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';

export default function WebsiteTemplate({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisible(true);
      return;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={`page-enter${visible ? ' is-visible' : ''}`}>{children}</div>
  );
}

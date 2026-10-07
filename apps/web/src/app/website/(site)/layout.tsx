import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { WhatsAppFab } from '@/components/site/whatsapp-fab';
import './site.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root flex min-h-screen flex-col">
      <a href="#main" className="site-skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </div>
  );
}

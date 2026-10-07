import { whatsappLink } from '@/lib/site/site-config';
import { WhatsAppIcon } from './icons';

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink('Hi Own A Rental, I would like to find out more.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Own A Rental on WhatsApp"
      className="fixed right-4 bottom-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

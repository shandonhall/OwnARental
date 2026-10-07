import { REQUIREMENTS } from '@/lib/site/site-content';
import { CheckIcon } from './icons';

export function RequirementsList({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const light = tone === 'light';
  return (
    <div>
      <ul className="space-y-3">
        {REQUIREMENTS.items.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                light ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <CheckIcon className="h-4 w-4" />
            </span>
            <span
              className={`text-base font-medium ${light ? 'text-white' : 'text-[var(--oar-navy)]'}`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
      <p className={`mt-4 text-sm ${light ? 'text-slate-300' : 'text-[var(--oar-grey)]'}`}>
        {REQUIREMENTS.note}
      </p>
    </div>
  );
}

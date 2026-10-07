import { HOW_IT_WORKS } from '@/lib/site/site-content';

export function HowItWorksSteps() {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {HOW_IT_WORKS.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 lg:flex-col">
          <span
            className="site-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--oar-navy)] text-xl font-bold text-white"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div>
            <h3 className="site-display text-xl font-bold text-[var(--oar-navy)]">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-1.5 leading-relaxed text-[var(--oar-grey)]">{step.copy}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

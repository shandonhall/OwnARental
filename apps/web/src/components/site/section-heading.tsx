export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  as: Tag = 'h2',
  tone = 'dark',
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
  tone?: 'dark' | 'light';
}) {
  const centered = align === 'center';
  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
      {eyebrow ? (
        <p className={`site-eyebrow ${tone === 'light' ? '!text-[var(--oar-gold)]' : ''}`}>
          {eyebrow}
        </p>
      ) : null}
      <Tag className={`site-h2 mt-2 ${tone === 'light' ? '!text-white' : ''}`}>{title}</Tag>
      {intro ? (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${
            tone === 'light' ? 'text-slate-300' : 'text-[var(--oar-grey)]'
          }`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

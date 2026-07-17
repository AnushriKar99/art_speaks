export function SectionHeading({
  eyebrow,
  title,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <span className="text-label-caps font-label-caps text-primary uppercase tracking-[0.1em]">
          {eyebrow}
        </span>
      ) : null}
      <h3 className="text-headline-md font-headline-md text-on-surface mt-1">
        {title}
      </h3>
    </div>
  );
}

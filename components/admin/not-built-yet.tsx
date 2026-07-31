import { Icon } from "@/components/ui/icon";

/**
 * Placeholder for a studio page whose shell exists but whose contents land in a
 * later phase. States plainly what will be here and when, rather than a bare
 * "coming soon" — an empty screen should still tell you where you are.
 */
export function NotBuiltYet({
  icon,
  title,
  summary,
  phase,
}: {
  icon: string;
  title: string;
  summary: string;
  phase: string;
}) {
  return (
    <>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        {title}
      </h1>
      <p className="text-body-md text-on-surface-variant mb-8">{summary}</p>

      <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
        <Icon name={icon} className="text-[40px] text-outline" />
        <p className="text-body-md text-on-surface-variant mt-3">
          Not built yet — this page lands in {phase}.
        </p>
      </div>
    </>
  );
}

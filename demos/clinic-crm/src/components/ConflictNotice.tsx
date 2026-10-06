import type { ScheduleConflict } from "../lib/conflicts";

const TONE_STYLES: Record<ScheduleConflict["tone"], string> = {
  neutral: "border-line bg-surface text-ink-muted",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

export function ConflictNotice({ conflict, message }: { conflict?: ScheduleConflict | null; message?: string }) {
  if (!conflict && !message) return null;

  return (
    <div
      className={[
        "rounded-2xl border px-3 py-2 text-[11px] font-medium",
        conflict ? TONE_STYLES[conflict.tone] : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div>{conflict?.title ?? message}</div>
      {conflict?.hint && <div className="mt-0.5 font-normal opacity-80">{conflict.hint}</div>}
    </div>
  );
}

export function conflictToneClasses(tone: ScheduleConflict["tone"]) {
  if (tone === "warning") return "border-amber-300 bg-amber-100/80 text-amber-800";
  if (tone === "danger") return "border-red-300 bg-red-100/80 text-red-700";
  return "border-line2 bg-surface/90 text-ink-muted";
}

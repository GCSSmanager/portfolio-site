export function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={[
        "px-3 py-2 rounded-2xl border text-xs",
        accent ? "bg-brand-light border-brand-soft text-brand-dark" : "bg-panel border-line text-ink-muted",
      ].join(" ")}
    >
      <span className="font-medium text-ink">{value}</span>
      <span className="ml-1.5">{label}</span>
    </div>
  );
}

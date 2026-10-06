export function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border px-3 py-2 text-xs",
        accent ? "border-brand-soft bg-brand-light text-brand-dark" : "border-line bg-panel text-ink-muted",
      ].join(" ")}
    >
      <span className="font-medium text-ink">{value}</span>
      <span className="ml-1.5">{label}</span>
    </div>
  );
}

import { formatServiceName } from "../lib/service-label";

interface Service {
  name: string;
  color: string;
  isGroup: boolean;
}

interface Props {
  services: Service[];
}

export function ServiceLegend({ services }: Props) {
  return (
    <div className="bg-panel border border-line rounded-3xl shadow-card p-4">
      <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Услуги</h3>
      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <span
            key={s.name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface border border-line"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {formatServiceName(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

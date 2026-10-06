import { useEffect, useState } from "react";
import {
  CLIENT_SLOT_WIDTH_MAX,
  CLIENT_SLOT_WIDTH_MIN,
  DEFAULT_CLIENT_SLOT_WIDTH,
  type ClientScheduleDisplayPreferences,
} from "../lib/client-schedule-preferences";
import { Button, Card, Field, Input } from "./ui";

interface Props {
  preferences: ClientScheduleDisplayPreferences;
  onSave: (preferences: ClientScheduleDisplayPreferences) => void;
  compact?: boolean;
}

export function ClientScheduleDisplaySettings({ preferences, onSave, compact = false }: Props) {
  const [draft, setDraft] = useState(preferences);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const update = (patch: Partial<ClientScheduleDisplayPreferences>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onSave(next);
  };

  const reset = () => {
    const next = { slotWidth: DEFAULT_CLIENT_SLOT_WIDTH };
    setDraft(next);
    onSave(next);
  };

  const content = (
    <div className="space-y-4">
      <Field label={`Ширина полоски · 15 мин (${CLIENT_SLOT_WIDTH_MIN}–${CLIENT_SLOT_WIDTH_MAX} px)`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={CLIENT_SLOT_WIDTH_MIN}
            max={CLIENT_SLOT_WIDTH_MAX}
            step={2}
            value={draft.slotWidth}
            onChange={(event) => update({ slotWidth: Number(event.target.value) })}
            className="flex-1 accent-brand"
          />
          <Input
            type="number"
            min={CLIENT_SLOT_WIDTH_MIN}
            max={CLIENT_SLOT_WIDTH_MAX}
            value={draft.slotWidth}
            onChange={(event) => update({ slotWidth: Number(event.target.value) })}
            className="!w-20 !px-2 text-center tabular-nums"
          />
        </div>
      </Field>

      <p className="text-xs text-ink-muted leading-relaxed">
        Увеличьте ширину, если записи накладываются друг на друга или текст не помещается.
      </p>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={reset}>
          Сбросить
        </Button>
      </div>
    </div>
  );

  if (compact) return content;

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-ink">Отображение расписания клиента</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Настройки сохраняются в этом браузере и применяются сразу.
        </p>
      </div>
      {content}
    </Card>
  );
}

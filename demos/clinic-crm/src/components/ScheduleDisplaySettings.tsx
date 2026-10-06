import { useEffect, useState } from "react";
import {
  COLUMN_WIDTH_MAX,
  COLUMN_WIDTH_MIN,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_FOCUSED_COLUMN_WIDTH,
  FOCUSED_COLUMN_WIDTH_MAX,
  FOCUSED_COLUMN_WIDTH_MIN,
  type ScheduleDisplayPreferences,
} from "../lib/schedule-preferences";
import { Button, Card, Field, Input } from "./ui";

interface Props {
  preferences: ScheduleDisplayPreferences;
  onSave: (preferences: ScheduleDisplayPreferences) => void;
  compact?: boolean;
}

export function ScheduleDisplaySettings({ preferences, onSave, compact = false }: Props) {
  const [draft, setDraft] = useState(preferences);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const update = (patch: Partial<ScheduleDisplayPreferences>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onSave(next);
  };

  const reset = () => {
    const next = {
      columnWidth: DEFAULT_COLUMN_WIDTH,
      focusedColumnWidth: DEFAULT_FOCUSED_COLUMN_WIDTH,
    };
    setDraft(next);
    onSave(next);
  };

  const content = (
    <div className="space-y-4">
      <Field label={`Ширина колонки · все специалисты (${COLUMN_WIDTH_MIN}–${COLUMN_WIDTH_MAX} px)`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={COLUMN_WIDTH_MIN}
            max={COLUMN_WIDTH_MAX}
            step={4}
            value={draft.columnWidth}
            onChange={(event) => update({ columnWidth: Number(event.target.value) })}
            className="flex-1 accent-brand"
          />
          <Input
            type="number"
            min={COLUMN_WIDTH_MIN}
            max={COLUMN_WIDTH_MAX}
            value={draft.columnWidth}
            onChange={(event) => update({ columnWidth: Number(event.target.value) })}
            className="!w-20 !px-2 text-center tabular-nums"
          />
        </div>
      </Field>

      <Field label={`Ширина колонки · один специалист (${FOCUSED_COLUMN_WIDTH_MIN}–${FOCUSED_COLUMN_WIDTH_MAX} px)`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={FOCUSED_COLUMN_WIDTH_MIN}
            max={FOCUSED_COLUMN_WIDTH_MAX}
            step={4}
            value={draft.focusedColumnWidth}
            onChange={(event) => update({ focusedColumnWidth: Number(event.target.value) })}
            className="flex-1 accent-brand"
          />
          <Input
            type="number"
            min={FOCUSED_COLUMN_WIDTH_MIN}
            max={FOCUSED_COLUMN_WIDTH_MAX}
            value={draft.focusedColumnWidth}
            onChange={(event) => update({ focusedColumnWidth: Number(event.target.value) })}
            className="!w-20 !px-2 text-center tabular-nums"
          />
        </div>
      </Field>

      <p className="text-xs text-ink-muted leading-relaxed">
        При фильтре «Все» используется узкая колонка — удобнее листать много специалистов.
        Если выбран один специалист, колонка расширяется до второго значения.
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
        <h2 className="text-base font-semibold text-ink">Отображение расписания</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Настройки сохраняются в этом браузере и применяются сразу.
        </p>
      </div>
      {content}
    </Card>
  );
}

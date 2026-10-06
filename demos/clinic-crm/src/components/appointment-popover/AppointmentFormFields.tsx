import type { Dispatch, ReactNode, SetStateAction } from "react";
import { minToTime } from "../../lib/format";
import { formatServiceName } from "../../lib/service-label";
import type { Client, Employee, Room, Service } from "../../lib/types";
import type { ScheduleConflict } from "../../lib/conflicts";
import type { SlotDraft } from "../../types/slot-draft";
import type { SearchOption } from "../ui";
import { Field, Input, SearchSelect, Button } from "../ui";
import { ConflictNotice } from "../ConflictNotice";
import { RoomPickerField } from "../RoomPickerField";

interface Props {
  draft: SlotDraft;
  canChangeSlot: boolean;
  attendanceOnly: boolean;
  staffEmployeeIds: string[];
  setStaffEmployeeIds: Dispatch<SetStateAction<string[]>>;
  setPickedEmployeeId: (value: string) => void;
  setApiError: (value: string) => void;
  staffOptionsForRow: (index: number) => SearchOption[];
  canAddStaffRow: boolean;
  pickedStartMin: number;
  setPickedStartMin: (value: number) => void;
  timeOptions: SearchOption[];
  slotConflict: ScheduleConflict | null;
  apiError: string;
  staffLabel: string;
  staffEmployees: Employee[];
  service: Service | undefined;
  conflictError: string;
  effectiveStartMin: number;
  endMin: number;
  slotLocked: boolean;
  isGroupEdit: boolean;
  supportsMultiClient: boolean;
  clientIds: string[];
  groupMembersSection?: ReactNode;
  isEdit: boolean;
  fixedClientId?: string;
  clients: Client[];
  activeClientIds: string[];
  setClientIds: Dispatch<SetStateAction<string[]>>;
  clientOptions: SearchOption[];
  lockedClientId: string | undefined;
  lockedClient: Client | undefined;
  removeClientRow: (index: number) => void;
  canAddClientRow: boolean;
  isDiagnosticBooking: boolean;
  serviceId: string;
  setServiceId: (value: string) => void;
  services: Service[];
  isJoinGroup: boolean;
  rooms: Room[];
  roomId: string;
  setRoomId: (value: string) => void;
  roomOptions: SearchOption[];
  note: string;
  setNote: (value: string) => void;
  onOpenClientCard?: (clientId: string) => void;
}

export function AppointmentFormFields({
  draft,
  canChangeSlot,
  attendanceOnly,
  staffEmployeeIds,
  setStaffEmployeeIds,
  setPickedEmployeeId,
  setApiError,
  staffOptionsForRow,
  canAddStaffRow,
  pickedStartMin,
  setPickedStartMin,
  timeOptions,
  slotConflict,
  apiError,
  staffLabel,
  staffEmployees,
  service,
  conflictError,
  effectiveStartMin,
  endMin,
  slotLocked,
  isGroupEdit,
  supportsMultiClient,
  clientIds,
  groupMembersSection,
  isEdit,
  fixedClientId,
  clients,
  activeClientIds,
  setClientIds,
  clientOptions,
  lockedClientId,
  lockedClient,
  removeClientRow,
  canAddClientRow,
  isDiagnosticBooking,
  serviceId,
  setServiceId,
  services,
  isJoinGroup,
  rooms,
  roomId,
  setRoomId,
  roomOptions,
  note,
  setNote,
  onOpenClientCard,
}: Props) {
  return (
    <>
      {canChangeSlot && !attendanceOnly && (
        <>
          <Field label={staffEmployeeIds.length > 1 ? "Специалисты" : "Специалист"}>
            <div className="space-y-2">
              {staffEmployeeIds.map((staffId, index) => (
                <div key={`staff-${index}`} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchSelect
                      value={staffId}
                      onChange={(value) => {
                        setStaffEmployeeIds((rows) =>
                          rows.map((row, rowIndex) => (rowIndex === index ? value : row)),
                        );
                        if (index === 0) setPickedEmployeeId(value);
                        setApiError("");
                      }}
                      options={staffOptionsForRow(index)}
                      placeholder="Выберите специалиста…"
                      searchPlaceholder="Специалист…"
                    />
                  </div>
                  {staffEmployeeIds.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!h-9 !px-2"
                      onClick={() => {
                        setStaffEmployeeIds((rows) => {
                          const next = rows.filter((_, rowIndex) => rowIndex !== index);
                          const first = next[0] ?? "";
                          setPickedEmployeeId(first);
                          return next.length ? next : [""];
                        });
                        setApiError("");
                      }}
                    >
                      −
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="!h-8"
                disabled={!canAddStaffRow}
                onClick={() => {
                  if (!canAddStaffRow) return;
                  setStaffEmployeeIds((rows) => [...rows, ""]);
                  setApiError("");
                }}
              >
                + Специалист
              </Button>
            </div>
          </Field>
          <Field label="Время">
            <SearchSelect
              value={String(pickedStartMin)}
              onChange={(value) => {
                setPickedStartMin(Number(value));
                setApiError("");
              }}
              options={timeOptions}
              placeholder="Выберите время…"
            />
          </Field>
        </>
      )}

      <div
        className={[
          "px-3 py-2.5 rounded-2xl text-sm border",
          slotConflict || apiError ? "bg-red-50/80 border-red-200" : "bg-brand-light/50 border-brand-soft",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink">{staffLabel}</span>
          {staffEmployees.length > 0 && service && (
            <>
              <span className="text-ink-muted">·</span>
              <span className={["font-semibold tabular-nums", conflictError ? "text-red-700" : "text-brand-dark"].join(" ")}>
                {minToTime(effectiveStartMin)}–{minToTime(endMin)}
              </span>
            </>
          )}
        </div>
        {!conflictError && staffEmployees.length > 0 && service && (
          <p className="text-[11px] text-ink-muted mt-1">
            {attendanceOnly
              ? formatServiceName(service)
              : canChangeSlot
                ? "Выбранное время"
                : slotLocked
                  ? "Время записи"
                  : "Выбранное время"}
          </p>
        )}
        <div className="mt-2">
          <ConflictNotice conflict={slotConflict} message={apiError} />
        </div>
      </div>

      <Field label={isGroupEdit ? "Участники" : supportsMultiClient && clientIds.length > 1 ? "Клиенты" : "Клиент"}>
        {isGroupEdit && groupMembersSection ? (
          groupMembersSection
        ) : attendanceOnly && isEdit && !isGroupEdit ? (
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
              {draft.appointment?.client.fullName ?? "—"}
            </div>
            {onOpenClientCard && draft.appointment?.client.id && (
              <Button
                type="button"
                variant="ghost"
                className="!h-9 shrink-0 !px-3"
                onClick={() => onOpenClientCard(draft.appointment!.client.id)}
              >
                Карточка
              </Button>
            )}
          </div>
        ) : isEdit && fixedClientId ? (
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
              {clients.find((client) => client.id === activeClientIds[0])?.fullName ?? "—"}
            </div>
            {onOpenClientCard && activeClientIds[0] && (
              <Button
                type="button"
                variant="ghost"
                className="!h-9 shrink-0 !px-3"
                onClick={() => onOpenClientCard(activeClientIds[0]!)}
              >
                Карточка
              </Button>
            )}
          </div>
        ) : isEdit ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                value={activeClientIds[0] ?? ""}
                onChange={(value) => {
                  setClientIds([value]);
                  setApiError("");
                }}
                options={clientOptions}
                placeholder="Найти клиента…"
                searchPlaceholder="Введите имя…"
              />
            </div>
            {onOpenClientCard && activeClientIds[0] && (
              <Button
                type="button"
                variant="ghost"
                className="!h-9 shrink-0 !px-3"
                onClick={() => onOpenClientCard(activeClientIds[0]!)}
              >
                Карточка
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {clientIds.map((id, index) => {
              const rowLocked = supportsMultiClient && !isGroupEdit && index === 0 && !!lockedClientId && lockedClient;
              const takenElsewhere = new Set(
                clientIds.filter((_, rowIndex) => rowIndex !== index && clientIds[rowIndex]),
              );
              const rowOptions = clientOptions.map((option) => ({
                ...option,
                disabled: option.disabled || (option.value !== "" && takenElsewhere.has(option.value)),
              }));

              return (
                <div key={`${index}-${id}`} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    {rowLocked ? (
                      <div className="flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
                        {lockedClient!.fullName}
                      </div>
                    ) : (
                      <SearchSelect
                        value={id}
                        onChange={(value) => {
                          setClientIds((rows) => rows.map((rowId, rowIndex) => (rowIndex === index ? value : rowId)));
                          setApiError("");
                        }}
                        options={rowOptions}
                        placeholder="Найти клиента…"
                        searchPlaceholder="Введите имя…"
                      />
                    )}
                  </div>
                  {supportsMultiClient && clientIds.length > 1 && !rowLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!h-9 !px-3 text-ink-muted hover:text-red-600"
                      onClick={() => removeClientRow(index)}
                    >
                      Убрать
                    </Button>
                  )}
                </div>
              );
            })}
            {supportsMultiClient && (
              <Button
                type="button"
                variant="ghost"
                className="!h-8 !px-3 text-xs"
                disabled={!canAddClientRow}
                onClick={() => {
                  if (!canAddClientRow) return;
                  setClientIds((rows) => [...rows, ""]);
                }}
              >
                + Клиент
              </Button>
            )}
          </div>
        )}
      </Field>

      {!attendanceOnly && (
      <Field label="Услуга">
        {isDiagnosticBooking ? (
          <div className="flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
            Диагностика
          </div>
        ) : slotLocked && service ? (
          <div className="flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
            {formatServiceName(service)}
          </div>
        ) : (
          <SearchSelect
            value={serviceId}
            onChange={(value) => {
              setServiceId(value);
              if (!services.find((item) => item.id === value)?.isGroup) {
                setClientIds((rows) => [rows[0] ?? ""]);
              }
              setApiError("");
            }}
            options={services.map((s) => ({ value: s.id, label: formatServiceName(s), hint: `${s.durationMin} мин` }))}
            placeholder="Выберите услугу…"
          />
        )}
      </Field>
      )}

      {!isJoinGroup && !attendanceOnly && (
        isDiagnosticBooking || slotLocked ? (
          <Field label="Кабинет">
            <div className="flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
              {rooms.find((room) => room.id === roomId)?.name
                ?? draft.appointment?.room?.name
                ?? draft.groupMembers?.[0]?.room?.name
                ?? "—"}
            </div>
          </Field>
        ) : (
          <RoomPickerField
            value={roomId}
            onChange={(value) => {
              setRoomId(value);
              setApiError("");
            }}
            options={roomOptions}
          />
        )
      )}

      {!attendanceOnly && (
      <Field label="Заметка">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
      </Field>
      )}
    </>
  );
}

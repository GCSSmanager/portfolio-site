import type { Dispatch, SetStateAction } from "react";
import type { Appointment } from "../../lib/types";
import type { SearchOption } from "../ui";
import { Button, SearchSelect } from "../ui";
import { AttendanceChoice, attendanceFromNoShow, noShowFromAttendance } from "../AttendanceChoice";

interface Props {
  groupMembers: Appointment[];
  attendanceOnly: boolean;
  isGroupEdit: boolean;
  removeGroupMemberPending: boolean;
  onRemoveMember: (member: Appointment) => void;
  groupMemberNoShow: Record<string, boolean | null>;
  setGroupMemberNoShow: Dispatch<SetStateAction<Record<string, boolean | null>>>;
  setApiError: (value: string) => void;
  newGroupClientIds: string[];
  setNewGroupClientIds: Dispatch<SetStateAction<string[]>>;
  clientOptions: SearchOption[];
  removeNewGroupClientRow: (index: number) => void;
  canAddGroupClientRow: boolean;
  onOpenClientCard?: (clientId: string) => void;
}

export function GroupMembersSection({
  groupMembers,
  attendanceOnly,
  isGroupEdit,
  removeGroupMemberPending,
  onRemoveMember,
  groupMemberNoShow,
  setGroupMemberNoShow,
  setApiError,
  newGroupClientIds,
  setNewGroupClientIds,
  clientOptions,
  removeNewGroupClientRow,
  canAddGroupClientRow,
  onOpenClientCard,
}: Props) {
  return (
    <div className="space-y-2">
      {groupMembers.map((member) => (
        <div key={member.id} className="space-y-2 rounded-xl border border-line bg-surface px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 text-sm font-medium text-ink">{member.client.fullName}</div>
            {onOpenClientCard && (
              <Button
                type="button"
                variant="ghost"
                className="!h-9 !px-3"
                onClick={() => onOpenClientCard(member.client.id)}
              >
                Карточка
              </Button>
            )}
            {!attendanceOnly && (
              <Button
                type="button"
                variant="ghost"
                className="!h-9 !px-3 text-ink-muted hover:text-red-600"
                disabled={removeGroupMemberPending}
                onClick={() => void onRemoveMember(member)}
              >
                Убрать
              </Button>
            )}
          </div>
          {(attendanceOnly || isGroupEdit) && (
            <AttendanceChoice
              value={attendanceFromNoShow(groupMemberNoShow[member.id] ?? member.clientNoShow ?? null)}
              onChange={(value) => {
                setGroupMemberNoShow((current) => ({
                  ...current,
                  [member.id]: noShowFromAttendance(value),
                }));
                setApiError("");
              }}
            />
          )}
        </div>
      ))}
      {!attendanceOnly && newGroupClientIds.map((id, index) => {
        const takenElsewhere = new Set([
          ...groupMembers.map((member) => member.client.id),
          ...newGroupClientIds.filter((_, rowIndex) => rowIndex !== index && newGroupClientIds[rowIndex]),
        ]);
        const rowOptions = clientOptions.map((option) => ({
          ...option,
          disabled: option.disabled || (option.value !== "" && takenElsewhere.has(option.value)),
        }));

        return (
          <div key={`new-group-client-${index}`} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                value={id}
                onChange={(value) => {
                  setNewGroupClientIds((rows) => rows.map((rowId, rowIndex) => (rowIndex === index ? value : rowId)));
                  setApiError("");
                }}
                options={rowOptions}
                placeholder="Найти клиента…"
                searchPlaceholder="Введите имя…"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="!h-9 !px-3 text-ink-muted hover:text-red-600"
              onClick={() => removeNewGroupClientRow(index)}
            >
              Убрать
            </Button>
          </div>
        );
      })}
      {!attendanceOnly && (
      <Button
        type="button"
        variant="ghost"
        className="!h-8 !px-3 text-xs"
        disabled={!canAddGroupClientRow}
        onClick={() => {
          if (!canAddGroupClientRow) return;
          setNewGroupClientIds((rows) => [...rows, ""]);
        }}
      >
        + Клиент
      </Button>
      )}
    </div>
  );
}

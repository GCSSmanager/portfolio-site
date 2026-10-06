import type { Service } from "../types";
import type { SlotSuggestion } from "../slot-suggestions";
import type { SlotDraft } from "../../types/slot-draft";

export function slotSuggestionToDraft(
  suggestion: SlotSuggestion,
  date: string,
  service: Service,
  clientId?: string,
  options?: { allowPickSlot?: boolean },
): SlotDraft {
  return {
    employeeId: suggestion.employee.id,
    employeeName: suggestion.employee.shortName,
    date,
    startMin: suggestion.startMin,
    endMin: suggestion.endMin,
    serviceId: service.id,
    roomId: suggestion.room?.id,
    clientId,
    joinGroupSessionId: suggestion.groupSessionId,
    allowPickSlot: options?.allowPickSlot,
  };
}

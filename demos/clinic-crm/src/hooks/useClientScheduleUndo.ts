import { useCallback, useRef } from "react";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import type { ClientScheduleUndoEntry } from "../lib/client-schedule-undo";
import { mutationErrorMessage, useToast } from "../components/feedback";

const MAX_UNDO_STACK = 50;

export function useClientScheduleUndo(refresh: () => void) {
  const toast = useToast();
  const stackRef = useRef<ClientScheduleUndoEntry[]>([]);
  const undoingRef = useRef(false);

  const push = useCallback((entry: ClientScheduleUndoEntry) => {
    if (undoingRef.current) return;
    stackRef.current.push(entry);
    if (stackRef.current.length > MAX_UNDO_STACK) {
      stackRef.current.shift();
    }
  }, []);

  const undo = useCallback(async () => {
    const entry = stackRef.current.pop();
    if (!entry) {
      toast({ tone: "info", title: "Нечего отменять" });
      return;
    }

    undoingRef.current = true;
    try {
      if (entry.kind === "move") {
        await api.patch(`/api/appointments/${entry.appointmentId}`, {
          date: entry.date,
          startMin: entry.startMin,
        });
      } else if (entry.kind === "create") {
        await api.delete(`/api/appointments/${entry.appointmentId}`);
      } else if (entry.kind === "absence-create") {
        await resources.absences.remove(entry.absenceId);
      } else {
        await api.post("/api/appointments", entry.payload);
      }
      refresh();
      toast({ tone: "success", title: "Действие отменено" });
    } catch (error) {
      stackRef.current.push(entry);
      toast({
        tone: "error",
        title: "Не удалось отменить",
        message: mutationErrorMessage(error),
      });
    } finally {
      undoingRef.current = false;
    }
  }, [refresh, toast]);

  return { push, undo };
}

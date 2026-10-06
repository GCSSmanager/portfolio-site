import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { resources } from "../lib/resources";
import type { DocumentRouteBoard, DocumentRouteStage } from "../lib/types";
import { canManageDocumentRouteStages } from "../lib/roles";
import { useAuth } from "../components/auth/AuthProvider";
import { mutationErrorMessage, useConfirm, useToast } from "../components/feedback";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Field,
  Input,
  ListSkeleton,
  Modal,
  ModalFooter,
  PageHeader,
} from "../components/ui";

type BoardStatus = "active" | "finishing" | "completed";

const STATUS_TABS: { id: BoardStatus; label: string }[] = [
  { id: "active", label: "На курсе" },
  { id: "finishing", label: "Заканчивают" },
  { id: "completed", label: "Закончили" },
];

function formatCheckedAt(value: string | null) {
  if (!value) return "";
  try {
    return format(parseISO(value), "d MMM yyyy, HH:mm", { locale: ru });
  } catch {
    return value;
  }
}

export function DocumentRoutePage() {
  const { user } = useAuth();
  const canManageStages = !!user && canManageDocumentRouteStages(user.role);
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<BoardStatus>("active");
  const [stagesOpen, setStagesOpen] = useState(false);

  const boardQ = useQuery({
    queryKey: ["document-route-board", status],
    queryFn: () => resources.documentRoute.board(status) as Promise<DocumentRouteBoard>,
  });

  const toggle = useMutation({
    mutationFn: (payload: { courseId: string; stageId: string; checked: boolean }) =>
      resources.documentRoute.setCheck(payload.courseId, payload.stageId, payload.checked),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-route-board"] });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось обновить", message: mutationErrorMessage(e) }),
  });

  const items = boardQ.data?.items ?? [];
  const stages = boardQ.data?.stages ?? [];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Маршрутизация документов"
        action={
          canManageStages ? (
            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setStagesOpen(true)}>
              Этапы
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1 sm:mb-6 sm:inline-flex">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={[
              "rounded-xl px-3 py-2 text-center text-xs font-medium transition-colors sm:px-4 sm:text-sm",
              status === tab.id ? "bg-brand text-white shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {boardQ.isLoading ? (
        <Card className="p-4">
          <ListSkeleton rows={6} />
        </Card>
      ) : stages.length === 0 ? (
        <Card className="p-6">
          <Empty
            text={
              canManageStages
                ? "Этапы ещё не настроены. Нажмите «Этапы», чтобы добавить чек-лист."
                : "Этапы маршрутизации ещё не настроены руководителем."
            }
          />
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-6">
          <Empty text="Нет курсов в этом разделе" />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.courseId} className="p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-ink">{item.clientName}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    Курс с {item.startedAt.split("-").reverse().join(".")}
                    {item.completedAt ? ` · завершён ${item.completedAt.split("-").reverse().join(".")}` : ""}
                    {item.stageCount > 0 ? ` · ${item.checkedCount}/${item.stageCount}` : ""}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {item.checks.map((check) => (
                  <div
                    key={check.stageId}
                    className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <Checkbox
                        checked={check.checked}
                        disabled={toggle.isPending}
                        onChange={(checked) =>
                          toggle.mutate({ courseId: item.courseId, stageId: check.stageId, checked })
                        }
                        label={<span className="text-sm text-ink">{check.title}</span>}
                      />
                    </div>
                    {check.checked && (
                      <div className="shrink-0 text-right text-[11px] leading-snug text-ink-muted">
                        <div>{check.checkedByName ?? "—"}</div>
                        <div>{formatCheckedAt(check.checkedAt)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canManageStages && (
        <StagesSettingsModal
          open={stagesOpen}
          onClose={() => setStagesOpen(false)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["document-route-board"] });
            qc.invalidateQueries({ queryKey: ["document-route-stages"] });
          }}
        />
      )}
    </div>
  );
}

function StagesSettingsModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const stagesQ = useQuery({
    queryKey: ["document-route-stages"],
    queryFn: () => resources.documentRoute.stages() as Promise<DocumentRouteStage[]>,
    enabled: open,
  });

  const stages = useMemo(() => stagesQ.data ?? [], [stagesQ.data]);

  const refresh = () => {
    stagesQ.refetch();
    onChanged();
  };

  const create = useMutation({
    mutationFn: async () => {
      const name = newTitle.trim();
      if (!name) throw new Error("Название обязательно");
      return resources.documentRoute.createStage({ title: name });
    },
    onSuccess: () => {
      setNewTitle("");
      refresh();
      toast({ tone: "success", title: "Этап добавлен" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка", message: mutationErrorMessage(e) }),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Этап не выбран");
      const name = editingTitle.trim();
      if (!name) throw new Error("Название обязательно");
      return resources.documentRoute.updateStage(editingId, { title: name });
    },
    onSuccess: () => {
      setEditingId(null);
      setEditingTitle("");
      refresh();
      toast({ tone: "success", title: "Этап обновлён" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка", message: mutationErrorMessage(e) }),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => resources.documentRoute.reorderStages(ids),
    onSuccess: () => {
      refresh();
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось переместить", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => resources.documentRoute.removeStage(id),
    onSuccess: () => {
      if (editingId) {
        setEditingId(null);
        setEditingTitle("");
      }
      refresh();
      toast({ tone: "success", title: "Этап удалён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const startEdit = (stage: DocumentRouteStage) => {
    setEditingId(stage.id);
    setEditingTitle(stage.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const moveStage = (stageId: string, direction: -1 | 1) => {
    const index = stages.findIndex((stage) => stage.id === stageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= stages.length) return;
    const next = [...stages];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    reorder.mutate(next.map((stage) => stage.id));
  };

  const confirmRemove = async (stage: DocumentRouteStage) => {
    const ok = await confirm({
      title: "Удалить этап?",
      message: `«${stage.title}» будет удалён вместе с отметками по курсам.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate(stage.id);
  };

  const busy = create.isPending || saveEdit.isPending || reorder.isPending || remove.isPending;

  return (
    <Modal open={open} title="Этапы маршрутизации" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-ink-muted">
          Этапы пустые по умолчанию. Порядок можно менять стрелками; название правится прямо в строке.
        </p>

        {stagesQ.isLoading ? (
          <ListSkeleton rows={4} />
        ) : stages.length === 0 ? (
          <Empty text="Пока нет этапов" />
        ) : (
          <div className="space-y-2">
            {stages.map((stage, index) => {
              const isEditing = editingId === stage.id;
              return (
                <div
                  key={stage.id}
                  className={[
                    "rounded-xl border px-3 py-2",
                    isEditing ? "border-brand-soft bg-brand/5" : "border-line bg-surface/40",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        className="flex h-6 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-panel hover:text-ink disabled:opacity-30"
                        disabled={busy || index === 0}
                        onClick={() => moveStage(stage.id, -1)}
                        aria-label="Выше"
                        title="Выше"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="flex h-6 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-panel hover:text-ink disabled:opacity-30"
                        disabled={busy || index === stages.length - 1}
                        onClick={() => moveStage(stage.id, 1)}
                        aria-label="Ниже"
                        title="Ниже"
                      >
                        ▼
                      </button>
                    </div>

                    {isEditing ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="min-w-0 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit.mutate();
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                    ) : (
                      <div className="min-w-0 flex-1 text-sm text-ink">{stage.title}</div>
                    )}

                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          className="!h-8 !px-2 !text-xs"
                          disabled={busy || !editingTitle.trim()}
                          onClick={() => saveEdit.mutate()}
                        >
                          Сохранить
                        </Button>
                        <Button variant="ghost" className="!h-8 !px-2 !text-xs" disabled={busy} onClick={cancelEdit}>
                          Отмена
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="!h-8 !px-2 !text-xs"
                          disabled={busy || !!editingId}
                          onClick={() => startEdit(stage)}
                        >
                          Изменить
                        </Button>
                        <Button
                          variant="danger"
                          className="!h-8 !px-2 !text-xs"
                          disabled={busy || !!editingId}
                          onClick={() => confirmRemove(stage)}
                        >
                          Удалить
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Field label="Новый этап">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Подал заявление…"
            disabled={!!editingId}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create.mutate();
              }
            }}
          />
        </Field>
        <ModalFooter
          onCancel={onClose}
          cancelText="Закрыть"
          onSubmit={() => create.mutate()}
          submitText="Добавить"
          submitDisabled={!newTitle.trim() || busy || !!editingId}
        />
      </div>
    </Modal>
  );
}

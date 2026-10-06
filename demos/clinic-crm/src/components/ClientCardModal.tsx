import { useEffect, useState, type TextareaHTMLAttributes } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { resources } from "../lib/resources";
import type { ClientCardResponse, ClientCourse, ClientCourseNote } from "../lib/types";
import { formatClientCategories } from "./ClientCategories";
import { useAuth } from "./auth/AuthProvider";
import { mutationErrorMessage, useToast } from "./feedback";
import { canManageClients } from "../lib/roles";
import { Button, DatePicker, Empty, Field, Modal, ModalFooter } from "./ui";

function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-3 py-2 bg-panel border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 ${className}`}
      {...props}
    />
  );
}

interface Props {
  clientId: string | null;
  onClose: () => void;
}

function prettyDate(value: string) {
  try {
    return format(parseISO(value.slice(0, 10)), "d MMMM yyyy", { locale: ru });
  } catch {
    return value.slice(0, 10);
  }
}

export function ClientCardModal({ clientId, onClose }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const isAdmin = user ? canManageClients(user.role) : false;
  const [noteBody, setNoteBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [completeDate, setCompleteDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [showPast, setShowPast] = useState(false);

  const cardQ = useQuery({
    queryKey: ["client-card", clientId],
    enabled: !!clientId,
    queryFn: () => resources.clients.card(clientId!) as Promise<ClientCardResponse>,
  });

  useEffect(() => {
    if (!clientId) {
      setNoteBody("");
      setEditingNoteId(null);
      setShowPast(false);
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setCompleteDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [clientId]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["client-card", clientId] });
    void qc.invalidateQueries({ queryKey: ["client-history", clientId] });
    void qc.invalidateQueries({ queryKey: ["document-route-board"] });
  };

  const startCourse = useMutation({
    mutationFn: () => resources.clients.startCourse(clientId!, { startedAt: startDate }),
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Курс начат" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось начать курс", message: mutationErrorMessage(e) }),
  });

  const updateCourse = useMutation({
    mutationFn: ({
      courseId,
      startedAt,
      completedAt,
    }: {
      courseId: string;
      startedAt?: string;
      completedAt?: string | null;
    }) => resources.clients.updateCourse(clientId!, courseId, { startedAt, completedAt }),
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Курс обновлён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось обновить курс", message: mutationErrorMessage(e) }),
  });

  const completeCourse = useMutation({
    mutationFn: (courseId: string) =>
      resources.clients.completeCourse(clientId!, courseId, { completedAt: completeDate }),
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Курс завершён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось завершить курс", message: mutationErrorMessage(e) }),
  });

  const addNote = useMutation({
    mutationFn: (courseId: string) => resources.clients.addCourseNote(clientId!, courseId, noteBody.trim()),
    onSuccess: () => {
      setNoteBody("");
      invalidate();
      toast({ tone: "success", title: "Заметка добавлена" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось сохранить заметку", message: mutationErrorMessage(e) }),
  });

  const updateNote = useMutation({
    mutationFn: ({ courseId, noteId, body }: { courseId: string; noteId: string; body: string }) =>
      resources.clients.updateCourseNote(clientId!, courseId, noteId, body),
    onSuccess: () => {
      setEditingNoteId(null);
      invalidate();
      toast({ tone: "success", title: "Заметка обновлена" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось обновить заметку", message: mutationErrorMessage(e) }),
  });

  const removeNote = useMutation({
    mutationFn: ({ courseId, noteId }: { courseId: string; noteId: string }) =>
      resources.clients.removeCourseNote(clientId!, courseId, noteId),
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Заметка удалена" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить заметку", message: mutationErrorMessage(e) }),
  });

  const data = cardQ.data;
  const active = data?.activeCourse ?? null;
  const pastCourses = (data?.courses ?? []).filter((course) => course.isCompleted);

  return (
    <Modal
      open={!!clientId}
      title={data?.client.fullName ? `Карточка · ${data.client.fullName}` : "Карточка клиента"}
      onClose={onClose}
      panelClassName="w-full max-w-lg sm:max-w-2xl"
    >
      {cardQ.isLoading || !data ? (
        <Empty text="Загрузка карточки…" />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-surface/60 px-3 py-3 text-sm space-y-1.5">
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted">Категории</span>
              <span className="text-right font-medium text-ink">
                {formatClientCategories(data.client.ageCategory, data.client.categories)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted">Телефон</span>
              <span className="font-medium text-ink">{data.client.phone || "—"}</span>
            </div>
            {data.client.group?.name && (
              <div className="flex justify-between gap-3">
                <span className="text-ink-muted">Группа</span>
                <span className="font-medium text-ink">{data.client.group.name}</span>
              </div>
            )}
            {data.client.note && (
              <div className="mt-2 rounded-xl bg-panel px-3 py-2 text-ink-muted">{data.client.note}</div>
            )}
          </div>

          {!active ? (
            <div className="rounded-2xl border border-dashed border-line px-4 py-5 space-y-3">
              <p className="text-center text-sm text-ink-muted">Нет активного курса</p>
              <Field label="Дата начала">
                <DatePicker value={startDate} onChange={setStartDate} />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={startCourse.isPending || !startDate}
                onClick={() => startCourse.mutate()}
              >
                Начать курс
              </Button>
            </div>
          ) : (
            <ActiveCourseSection
              course={active}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              noteBody={noteBody}
              setNoteBody={setNoteBody}
              editingNoteId={editingNoteId}
              editingBody={editingBody}
              setEditingNoteId={setEditingNoteId}
              setEditingBody={setEditingBody}
              completeDate={completeDate}
              setCompleteDate={setCompleteDate}
              onAddNote={() => addNote.mutate(active.id)}
              addPending={addNote.isPending}
              onSaveEdit={(noteId) =>
                updateNote.mutate({ courseId: active.id, noteId, body: editingBody.trim() })
              }
              updatePending={updateNote.isPending}
              onRemoveNote={(noteId) => removeNote.mutate({ courseId: active.id, noteId })}
              removePending={removeNote.isPending}
              onComplete={() => completeCourse.mutate(active.id)}
              completePending={completeCourse.isPending}
              onUpdateStartedAt={(startedAt) => updateCourse.mutate({ courseId: active.id, startedAt })}
              updateCoursePending={updateCourse.isPending}
            />
          )}

          {pastCourses.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-ink"
                onClick={() => setShowPast((value) => !value)}
              >
                Прошлые курсы ({pastCourses.length}) {showPast ? "▴" : "▾"}
              </button>
              {showPast && (
                <div className="space-y-3">
                  {pastCourses.map((course) => (
                    <PastCourseBlock
                      key={course.id}
                      course={course}
                      onSaveDates={({ startedAt, completedAt }) =>
                        updateCourse.mutate({ courseId: course.id, startedAt, completedAt })
                      }
                      savePending={updateCourse.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function ActiveCourseSection({
  course,
  currentUserId,
  isAdmin,
  noteBody,
  setNoteBody,
  editingNoteId,
  editingBody,
  setEditingNoteId,
  setEditingBody,
  completeDate,
  setCompleteDate,
  onAddNote,
  addPending,
  onSaveEdit,
  updatePending,
  onRemoveNote,
  removePending,
  onComplete,
  completePending,
  onUpdateStartedAt,
  updateCoursePending,
}: {
  course: ClientCourse;
  currentUserId?: string;
  isAdmin: boolean;
  noteBody: string;
  setNoteBody: (value: string) => void;
  editingNoteId: string | null;
  editingBody: string;
  setEditingNoteId: (value: string | null) => void;
  setEditingBody: (value: string) => void;
  completeDate: string;
  setCompleteDate: (value: string) => void;
  onAddNote: () => void;
  addPending: boolean;
  onSaveEdit: (noteId: string) => void;
  updatePending: boolean;
  onRemoveNote: (noteId: string) => void;
  removePending: boolean;
  onComplete: () => void;
  completePending: boolean;
  onUpdateStartedAt: (startedAt: string) => void;
  updateCoursePending: boolean;
}) {
  const [editingDates, setEditingDates] = useState(false);
  const [editStartedAt, setEditStartedAt] = useState(course.startedAt);

  useEffect(() => {
    setEditStartedAt(course.startedAt);
    setEditingDates(false);
  }, [course.id, course.startedAt]);

  return (
    <div className="space-y-4 rounded-2xl border border-brand/30 bg-brand-light/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Активный курс</div>
          {editingDates ? (
            <div className="mt-2 space-y-2">
              <Field label="Дата начала">
                <DatePicker value={editStartedAt} onChange={setEditStartedAt} />
              </Field>
              <ModalFooter
                onCancel={() => {
                  setEditStartedAt(course.startedAt);
                  setEditingDates(false);
                }}
                onSubmit={() => onUpdateStartedAt(editStartedAt)}
                submitText="Сохранить"
                submitDisabled={!editStartedAt || editStartedAt === course.startedAt || updateCoursePending}
              />
            </div>
          ) : (
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <div className="text-sm text-ink">с {prettyDate(course.startedAt)}</div>
              <Button
                type="button"
                variant="ghost"
                className="!h-7 !px-2 !text-xs"
                onClick={() => setEditingDates(true)}
              >
                Изменить
              </Button>
            </div>
          )}
        </div>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
          {course.notes.length} зам.
        </span>
      </div>

      <div className="space-y-2">
        {course.notes.length === 0 ? (
          <p className="text-sm text-ink-muted">Заметок пока нет</p>
        ) : (
          course.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={isAdmin || note.authorUserId === currentUserId}
              editing={editingNoteId === note.id}
              editingBody={editingBody}
              onStartEdit={() => {
                setEditingNoteId(note.id);
                setEditingBody(note.body);
              }}
              onCancelEdit={() => setEditingNoteId(null)}
              onChangeBody={setEditingBody}
              onSave={() => onSaveEdit(note.id)}
              onRemove={() => onRemoveNote(note.id)}
              savePending={updatePending}
              removePending={removePending}
            />
          ))
        )}
      </div>

      <Field label="Новая заметка">
        <TextArea
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          rows={3}
          placeholder="Наблюдения, рекомендации…"
        />
      </Field>
      <Button
        type="button"
        disabled={!noteBody.trim() || addPending}
        onClick={onAddNote}
      >
        Добавить заметку
      </Button>

      <div className="border-t border-line pt-4 space-y-3">
        <Field label="Дата завершения">
          <DatePicker value={completeDate} onChange={setCompleteDate} />
        </Field>
        <Button
          type="button"
          variant="danger"
          disabled={completePending}
          onClick={onComplete}
        >
          Курс завершён
        </Button>
      </div>
    </div>
  );
}

function PastCourseBlock({
  course,
  onSaveDates,
  savePending,
}: {
  course: ClientCourse;
  onSaveDates: (dates: { startedAt: string; completedAt: string }) => void;
  savePending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [startedAt, setStartedAt] = useState(course.startedAt);
  const [completedAt, setCompletedAt] = useState(course.completedAt ?? course.startedAt);

  useEffect(() => {
    setStartedAt(course.startedAt);
    setCompletedAt(course.completedAt ?? course.startedAt);
    setEditing(false);
  }, [course.id, course.startedAt, course.completedAt]);

  const unchanged =
    startedAt === course.startedAt && completedAt === (course.completedAt ?? course.startedAt);
  const invalidRange = Boolean(startedAt && completedAt && completedAt < startedAt);

  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {editing ? (
          <div className="w-full space-y-2">
            <Field label="Дата начала">
              <DatePicker value={startedAt} onChange={setStartedAt} />
            </Field>
            <Field label="Дата завершения">
              <DatePicker value={completedAt} onChange={setCompletedAt} />
            </Field>
            {invalidRange && (
              <p className="text-xs text-red-600">Дата завершения раньше начала курса</p>
            )}
            <ModalFooter
              onCancel={() => {
                setStartedAt(course.startedAt);
                setCompletedAt(course.completedAt ?? course.startedAt);
                setEditing(false);
              }}
              onSubmit={() => onSaveDates({ startedAt, completedAt })}
              submitText="Сохранить"
              submitDisabled={!startedAt || !completedAt || unchanged || invalidRange || savePending}
            />
          </div>
        ) : (
          <>
            <span className="font-medium text-ink">
              {prettyDate(course.startedAt)}
              {course.completedAt ? ` — ${prettyDate(course.completedAt)}` : ""}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                className="!h-7 !px-2 !text-xs"
                onClick={() => setEditing(true)}
              >
                Изменить
              </Button>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                завершён · {course.notes.length} зам.
              </span>
            </div>
          </>
        )}
      </div>
      {course.notes.length > 0 && (
        <div className="space-y-1.5">
          {course.notes.map((note) => (
            <div key={note.id} className="rounded-xl bg-surface px-2.5 py-2 text-xs text-ink-muted">
              <div className="font-medium text-ink/80">{note.authorName}</div>
              <div className="mt-0.5 whitespace-pre-wrap">{note.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  canEdit,
  editing,
  editingBody,
  onStartEdit,
  onCancelEdit,
  onChangeBody,
  onSave,
  onRemove,
  savePending,
  removePending,
}: {
  note: ClientCourseNote;
  canEdit: boolean;
  editing: boolean;
  editingBody: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeBody: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
  savePending: boolean;
  removePending: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-ink">{note.authorName}</div>
          <div className="text-[10px] text-ink-muted">
            {format(parseISO(note.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
          </div>
        </div>
        {canEdit && !editing && (
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" className="!h-7 !px-2 !text-xs" onClick={onStartEdit}>
              Изменить
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="!h-7 !px-2 !text-xs text-red-600"
              disabled={removePending}
              onClick={onRemove}
            >
              Удалить
            </Button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <TextArea rows={3} value={editingBody} onChange={(event) => onChangeBody(event.target.value)} />
          <ModalFooter
            onCancel={onCancelEdit}
            onSubmit={onSave}
            submitText="Сохранить"
            submitDisabled={!editingBody.trim() || savePending}
          />
        </div>
      ) : (
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{note.body}</p>
      )}
    </div>
  );
}

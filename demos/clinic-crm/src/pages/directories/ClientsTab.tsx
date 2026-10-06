import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { resources } from "../../lib/resources";
import type { Appointment, Client, ClientCourse, ClientGroup, ClientHistoryResponse } from "../../lib/types";
import { minToTime } from "../../lib/format";
import { formatServiceName } from "../../lib/service-label";
import { Button, Card, Checkbox, DatePicker, Empty, Field, Input, ListSkeleton, Modal, ModalFooter, Picker, SearchSelect, Table, Td, Th } from "../../components/ui";
import { ClientCategoriesField, ClientCategoryBadges, formatClientCategories } from "../../components/ClientCategories";
import { CLIENT_AGE_OPTIONS, type ClientAgeCategory, type ClientCategory } from "../../lib/clientCategories";
import { mutationErrorMessage, useConfirm, useToast } from "../../components/feedback";
import { useAuth } from "../../components/auth/AuthProvider";
import { canAccessClientCard, canManageClients, canManageDirectories } from "../../lib/roles";
import { ClientCardModal } from "../../components/ClientCardModal";

export function ClientsTab() {
  const { user } = useAuth();
  const canWriteClients = user ? canManageClients(user.role) : false;
  const canManageAllDirectories = user ? canManageDirectories(user.role) : false;
  const canOpenCard = user ? canAccessClientCard(user.role) : false;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients", "all"], queryFn: () => resources.clients.list() });
  const { data: groups = [] } = useQuery({ queryKey: ["client-groups"], queryFn: resources.clientGroups.list });
  const [editing, setEditing] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [cardClientId, setCardClientId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [groupEditing, setGroupEditing] = useState<ClientGroup | null>(null);
  const [groupCreating, setGroupCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterAgeCategory, setFilterAgeCategory] = useState<ClientAgeCategory | "">("");
  const [filterPrimary, setFilterPrimary] = useState<"" | "primary" | "returning">("");

  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    const tokens = query.split(/\s+/).filter(Boolean);
    return (clients as Client[]).filter((client) => {
      if (filterGroupId === "__none__") {
        if (client.groupId) return false;
      } else if (filterGroupId && client.groupId !== filterGroupId) {
        return false;
      }
      if (filterAgeCategory && client.ageCategory !== filterAgeCategory) return false;
      if (filterPrimary === "primary" && !client.isPrimary) return false;
      if (filterPrimary === "returning" && client.isPrimary) return false;
      if (!tokens.length) return true;

      const fields = [
        client.fullName,
        client.phone ?? "",
        client.note ?? "",
        client.group?.name ?? "",
      ].map((value) => value.toLocaleLowerCase("ru"));
      const words = fields.flatMap((field) => field.split(/[\s,.;:+\-_/\\]+/).filter(Boolean));

      return tokens.every(
        (token) =>
          fields.some((field) => field.includes(token)) ||
          words.some((word) => word.startsWith(token)),
      );
    });
  }, [clients, filterAgeCategory, filterGroupId, filterPrimary, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client-groups"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const saveClient = useMutation({
    mutationFn: (p: { id?: string; data: Partial<Client> }) =>
      p.id ? resources.clients.update(p.id, p.data) : resources.clients.create(p.data),
    onSuccess: (_, vars) => {
      invalidate();
      setEditing(null);
      setCreating(false);
      toast({ tone: "success", title: vars.id ? "Клиент обновлён" : "Клиент создан" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const removeClient = useMutation({
    mutationFn: resources.clients.remove,
    onSuccess: () => { invalidate(); toast({ tone: "success", title: "Клиент удалён" }); },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const saveGroup = useMutation({
    mutationFn: (p: { id?: string; name: string }) =>
      p.id ? resources.clientGroups.update(p.id, { name: p.name }) : resources.clientGroups.create({ name: p.name }),
    onSuccess: (_, vars) => {
      invalidate();
      setGroupEditing(null);
      setGroupCreating(false);
      toast({ tone: "success", title: vars.id ? "Группа обновлена" : "Группа создана" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const removeGroup = useMutation({
    mutationFn: resources.clientGroups.remove,
    onSuccess: () => { invalidate(); toast({ tone: "success", title: "Группа удалена" }); },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const confirmRemoveClient = async (client: Client) => {
    const ok = await confirm({
      title: "Удалить клиента?",
      message: `${client.fullName} будет удалён из базы вместе с его записями в расписании.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) removeClient.mutate(client.id);
  };

  const confirmRemoveGroup = async (group: ClientGroup) => {
    const ok = await confirm({
      title: "Удалить группу?",
      message: `Группа «${group.name}» будет удалена. Клиентов лучше заранее перенести в другую группу.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) removeGroup.mutate(group.id);
  };

  if (isLoading) return <Card className="p-4"><ListSkeleton rows={8} /></Card>;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Клиенты</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block space-y-1.5">
                <span className="flex items-baseline justify-between gap-2 text-xs font-medium text-ink-muted">
                  <span>Поиск</span>
                  {(search.trim() || filterGroupId || filterAgeCategory || filterPrimary) && (
                    <span className="font-normal tabular-nums">{filteredClients.length} из {clients.length}</span>
                  )}
                </span>
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                  placeholder="ФИО, телефон, заметка…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <Field label="Группа">
                <SearchSelect
                  value={filterGroupId}
                  onChange={setFilterGroupId}
                  options={[
                    { value: "", label: "Все группы" },
                    { value: "__none__", label: "Без группы" },
                    ...groups.map((group: ClientGroup) => ({ value: group.id, label: group.name })),
                  ]}
                  placeholder="Все группы"
                  searchable={groups.length > 6}
                />
              </Field>
              <Field label="Возраст">
                <Picker
                  value={filterAgeCategory}
                  onChange={(value) => setFilterAgeCategory(value as ClientAgeCategory | "")}
                  options={[
                    { value: "", label: "Все" },
                    ...CLIENT_AGE_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
                  ]}
                  placeholder="Все"
                />
              </Field>
              <Field label="Тип">
                <Picker
                  value={filterPrimary}
                  onChange={(value) => setFilterPrimary(value as "" | "primary" | "returning")}
                  options={[
                    { value: "", label: "Все" },
                    { value: "primary", label: "Первичный" },
                    { value: "returning", label: "Повторный" },
                  ]}
                  placeholder="Все"
                />
              </Field>
            </div>
          </div>
          {canWriteClients && (
            <Button
              className="w-full sm:w-auto shrink-0"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              + Клиент
            </Button>
          )}
        </div>
        <Card>
          {clients.length === 0 ? (
            <Empty text="Нет клиентов" />
          ) : filteredClients.length === 0 ? (
            <Empty text="Нет клиентов по выбранным фильтрам" />
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {filteredClients.map((c: Client) => (
                  <div key={c.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-ink">{c.fullName}</div>
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            c.isPrimary
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-line bg-surface text-ink-muted",
                          ].join(" ")}
                        >
                          {c.isPrimary ? "первичный" : "повторный"}
                        </span>
                      </div>
                      <div className="mt-1">
                        <ClientCategoryBadges ageCategory={c.ageCategory} categories={c.categories} compact />
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">
                        {c.phone ?? "Без телефона"}
                        {c.group?.name ? ` · ${c.group.name}` : ""}
                      </div>
                      {c.note && <div className="mt-1 truncate text-xs text-ink-muted">{c.note}</div>}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className={`grid gap-2 ${canWriteClients ? "grid-cols-2" : canOpenCard ? "grid-cols-2" : "grid-cols-1"}`}>
                        {canOpenCard && (
                          <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setCardClientId(c.id)}>
                            Карточка
                          </Button>
                        )}
                        <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setHistoryClient(c)}>
                          История
                        </Button>
                        {canWriteClients && (
                          <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setEditing(c)}>
                            Изменить
                          </Button>
                        )}
                      </div>
                      {canManageAllDirectories && (
                        <Button variant="danger" className="!h-10 w-full !text-sm" onClick={() => confirmRemoveClient(c)}>
                          Удалить
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <thead>
                    <tr>
                      <Th>ФИО</Th>
                      <Th>Тип</Th>
                      <Th>Категории</Th>
                      <Th>Телефон</Th>
                      <Th>Группа</Th>
                      <Th>Заметка</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c: Client) => (
                      <tr key={c.id} className="hover:bg-surface/60">
                        <Td>{c.fullName}</Td>
                        <Td>
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              c.isPrimary
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-line bg-surface text-ink-muted",
                            ].join(" ")}
                          >
                            {c.isPrimary ? "первичный" : "повторный"}
                          </span>
                        </Td>
                        <Td>
                          <ClientCategoryBadges ageCategory={c.ageCategory} categories={c.categories} compact />
                        </Td>
                        <Td className="text-ink-muted">{c.phone ?? "—"}</Td>
                        <Td className="text-ink-muted">{c.group?.name ?? "—"}</Td>
                        <Td className="text-xs text-ink-muted">{c.note ?? "—"}</Td>
                        <Td className="space-x-2 text-right">
                          {canOpenCard && (
                            <Button variant="ghost" className="!h-8 !px-3" onClick={() => setCardClientId(c.id)}>
                              Карточка
                            </Button>
                          )}
                          <Button variant="ghost" className="!h-8 !px-3" onClick={() => setHistoryClient(c)}>
                            История
                          </Button>
                          {canWriteClients && (
                            <Button variant="ghost" className="!h-8 !px-3" onClick={() => setEditing(c)}>
                              Изменить
                            </Button>
                          )}
                          {canManageAllDirectories && (
                            <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemoveClient(c)}>
                              Удалить
                            </Button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </section>

      {canManageAllDirectories && (
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-ink">Группы (семьи)</h2>
            <Button className="w-full sm:w-auto" onClick={() => setGroupCreating(true)}>
              + Группа
            </Button>
          </div>
          <Card>
            {groups.length === 0 ? (
              <Empty text="Нет групп" />
            ) : (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {groups.map((g: ClientGroup) => (
                    <div key={g.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                      <div className="truncate text-sm font-semibold text-ink">{g.name}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">Клиентов: {g._count?.clients ?? 0}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setGroupEditing(g)}>
                          Изменить
                        </Button>
                        <Button variant="danger" className="!h-10 min-w-0 !text-sm" onClick={() => confirmRemoveGroup(g)}>
                          Удалить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Название</Th>
                        <Th>Клиентов</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g: ClientGroup) => (
                        <tr key={g.id} className="hover:bg-surface/60">
                          <Td>{g.name}</Td>
                          <Td className="text-ink-muted">{g._count?.clients ?? 0}</Td>
                          <Td className="space-x-2 text-right">
                            <Button variant="ghost" className="!h-8 !px-3" onClick={() => setGroupEditing(g)}>
                              Изменить
                            </Button>
                            <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemoveGroup(g)}>
                              Удалить
                            </Button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </section>
      )}

      <ClientForm open={creating || !!editing} item={editing} groups={groups}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(data) => saveClient.mutate({ id: editing?.id, data })} loading={saveClient.isPending} />

      <ClientHistoryModal
        client={historyClient}
        onClose={() => setHistoryClient(null)}
        onGoToSchedule={(date) => navigate(`/?date=${date}`)}
        onOpenCard={canOpenCard ? (id) => setCardClientId(id) : undefined}
      />

      <ClientCardModal clientId={cardClientId} onClose={() => setCardClientId(null)} />

      <GroupForm open={groupCreating || !!groupEditing} item={groupEditing}
        onClose={() => { setGroupCreating(false); setGroupEditing(null); }}
        onSave={(name) => saveGroup.mutate({ id: groupEditing?.id, name })} loading={saveGroup.isPending} />
    </div>
  );
}

function prettyDate(date: string) {
  return format(parseISO(date.slice(0, 10)), "d MMMM yyyy", { locale: ru });
}

function historyDate(date: string) {
  return date.slice(0, 10);
}

function ClientHistoryModal({
  client,
  onClose,
  onGoToSchedule,
  onOpenCard,
}: {
  client: Client | null;
  onClose: () => void;
  onGoToSchedule: (date: string) => void;
  onOpenCard?: (clientId: string) => void;
}) {
  const historyQ = useQuery({
    queryKey: ["client-history", client?.id],
    enabled: !!client,
    queryFn: async () => (await api.get<ClientHistoryResponse>(`/api/clients/${client!.id}/history`)).data,
  });

  const data = historyQ.data;
  const courses = data?.courses ?? [];
  const events = (data?.appointments ?? []).map((item) => ({
    kind: "appointment" as const,
    date: historyDate(item.date),
    startMin: item.startMin,
    item,
  })).sort((a, b) => b.date.localeCompare(a.date) || b.startMin - a.startMin);

  return (
    <Modal open={!!client} title="История клиента" onClose={onClose} panelClassName="w-full max-w-lg sm:max-w-3xl lg:max-w-7xl lg:w-[min(96vw,80rem)]">
      {historyQ.isLoading || !data ? (
        <Empty text="Загрузка истории…" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-6">
          <aside className="space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-ink">{data.client.fullName}</h2>
              <div className="mt-3 space-y-2 text-sm">
                <InfoLine label="Категории" value={formatClientCategories(data.client.ageCategory, data.client.categories)} />
                <InfoLine label="Телефон" value={data.client.phone ?? "—"} />
                <InfoLine label="Группа" value={data.client.group?.name ?? "—"} />
              </div>
              {data.client.note && (
                <div className="mt-4 rounded-2xl bg-surface px-3 py-2 text-sm text-ink-muted">
                  {data.client.note}
                </div>
              )}
              {onOpenCard && (
                <Button className="mt-4 w-full" variant="ghost" onClick={() => onOpenCard(data.client.id)}>
                  Открыть карточку
                </Button>
              )}
            </Card>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Курсов" value={String(courses.length)} />
              <MiniStat label="Занятий" value={String(data.appointments.length)} />
              <MiniStat label="Всего" value={String(events.length + courses.length)} />
            </div>

            {data.client.group?.clients?.length ? (
              <Card className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Группа / семья</h3>
                <div className="space-y-2">
                  {data.client.group.clients.map((member) => (
                    <div
                      key={member.id}
                      className={[
                        "rounded-2xl px-3 py-2 text-sm",
                        member.id === data.client.id ? "bg-brand-light text-brand-dark font-medium" : "bg-surface text-ink-muted",
                      ].join(" ")}
                    >
                      {member.fullName}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </aside>

          <section className="space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Курсы</h3>
              </div>
              {courses.length === 0 ? (
                <Empty text="Курсов пока нет" />
              ) : (
                <div className="divide-y divide-line max-h-[30vh] overflow-y-auto">
                  {courses.map((course) => (
                    <HistoryCourseRow key={course.id} course={course} />
                  ))}
                </div>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Занятия</h3>
              </div>
              {events.length === 0 ? (
                <Empty text="У клиента пока нет занятий" />
              ) : (
                <div className="divide-y divide-line max-h-[50vh] overflow-y-auto">
                  {events.map((event) => (
                    <HistoryEvent
                      key={`${event.kind}-${event.item.id}`}
                      event={event}
                      onGoToSchedule={() => {
                        onGoToSchedule(event.date);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </Card>
          </section>
        </div>
      )}
    </Modal>
  );
}

function HistoryCourseRow({ course }: { course: ClientCourse }) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-ink">
          {prettyDate(course.startedAt)}
          {course.completedAt ? ` — ${prettyDate(course.completedAt)}` : ""}
        </span>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            course.isCompleted ? "bg-surface text-ink-muted" : "bg-brand-light text-brand-dark",
          ].join(" ")}
        >
          {course.isCompleted ? "курс · завершён" : "курс · активный"}
        </span>
        <span className="text-[10px] text-ink-muted">{course.notes.length} зам.</span>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3 text-center shadow-card">
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}

function HistoryEvent({
  event,
  onGoToSchedule,
}: {
  event: { kind: "appointment"; date: string; startMin: number; item: Appointment };
  onGoToSchedule: () => void;
}) {
  const title = formatServiceName(event.item.service);
  const specialists = event.item.employee.shortName;
  const room = event.item.room?.name;

  return (
    <div className="px-4 py-4 transition-colors hover:bg-surface/60 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tabular-nums text-ink">
              {prettyDate(event.date)} · {minToTime(event.item.startMin)}–{minToTime(event.item.endMin)}
            </span>
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-medium text-brand-dark">
              занятие
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-ink">{title}</div>
          <div className="mt-1 text-xs text-ink-muted">
            {specialists}
            {room ? ` · ${room}` : ""}
          </div>
          {event.item.note && <div className="mt-2 text-xs text-ink-muted">{event.item.note}</div>}
        </div>
        <Button variant="ghost" className="!h-10 w-full shrink-0 !text-sm sm:!h-8 sm:w-auto sm:!px-3" onClick={onGoToSchedule}>
          В расписание
        </Button>
      </div>
    </div>
  );
}

function ClientForm({ open, item, groups, onClose, onSave, loading }: {
  open: boolean; item: Client | null; groups: ClientGroup[];
  onClose: () => void; onSave: (d: Partial<Client>) => void; loading: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthDateOk, setBirthDateOk] = useState(true);
  const [groupId, setGroupId] = useState("");
  const [ageCategory, setAgeCategory] = useState<ClientAgeCategory | "">("");
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [isPrimary, setIsPrimary] = useState(true);
  const [prevOpen, setPrevOpen] = useState(false);
  const canSubmit = !!fullName.trim() && !!ageCategory && birthDateOk && !loading;

  const buildPayload = (): Partial<Client> => ({
    fullName,
    phone: phone || null,
    note: note || null,
    birthDate: birthDate || null,
    groupId: groupId || null,
    ageCategory: ageCategory || null,
    categories,
    isPrimary,
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFullName(item?.fullName ?? "");
      setPhone(item?.phone ?? "");
      setNote(item?.note ?? "");
      setBirthDate(item?.birthDate?.slice(0, 10) ?? "");
      setBirthDateOk(true);
      setGroupId(item?.groupId ?? "");
      setAgeCategory(item?.ageCategory ?? "");
      setCategories(item?.categories ?? []);
      // Новый клиент — по умолчанию первичный; уже в базе без флага — повторный.
      setIsPrimary(item ? !!item.isPrimary : true);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSubmit) {
        event.preventDefault();
        onSave(buildPayload());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, fullName, phone, note, birthDate, birthDateOk, groupId, ageCategory, categories, isPrimary, loading, canSubmit, onSave]);

  return (
    <Modal open={open} title={item ? "Редактировать клиента" : "Новый клиент"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="ФИО"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Дата рождения">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <DatePicker
                value={birthDate}
                onChange={setBirthDate}
                onValidityChange={setBirthDateOk}
                placeholder="15052018"
                invalid={!birthDateOk}
              />
            </div>
            {birthDate ? (
              <button
                type="button"
                className="shrink-0 text-xs text-ink-muted hover:text-ink transition-colors"
                onClick={() => {
                  setBirthDate("");
                  setBirthDateOk(true);
                }}
              >
                Очистить
              </button>
            ) : null}
          </div>
        </Field>
        <ClientCategoriesField
          ageCategory={ageCategory}
          categories={categories}
          onAgeCategoryChange={setAgeCategory}
          onCategoriesChange={setCategories}
        />
        <Field label="Телефон"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Группа">
          <SearchSelect
            value={groupId}
            onChange={setGroupId}
            options={[
              { value: "", label: "— без группы —" },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
            placeholder="Выберите группу"
            searchable={groups.length > 6}
          />
        </Field>
        <Field label="Заметка"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Checkbox
          checked={isPrimary}
          onChange={setIsPrimary}
          label="Первичный клиент (ещё не обращался до CRM)"
        />
        {!isPrimary && (
          <p className="text-xs text-ink-muted -mt-2">
            Снимите галочку, если клиент уже бывал раньше — в статистике он будет повторным.
          </p>
        )}
        <ModalFooter
          onCancel={onClose}
          onSubmit={() => onSave(buildPayload())}
          submitDisabled={!canSubmit}
        />
      </div>
    </Modal>
  );
}

function GroupForm({ open, item, onClose, onSave, loading }: {
  open: boolean; item: ClientGroup | null; onClose: () => void; onSave: (name: string) => void; loading: boolean;
}) {
  const [name, setName] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) { setPrevOpen(open); if (open) setName(item?.name ?? ""); }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && name && !loading) {
        event.preventDefault();
        onSave(name);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, name, loading, onSave]);

  return (
    <Modal open={open} title={item ? "Редактировать группу" : "Новая группа"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Название"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Семья Ивановых" /></Field>
        <ModalFooter
          onCancel={onClose}
          onSubmit={() => onSave(name)}
          submitDisabled={loading || !name}
        />
      </div>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resources } from "../lib/resources";
import type { Client, DocumentTemplate, DocumentVariable } from "../lib/types";
import { mutationErrorMessage, useConfirm, useToast } from "../components/feedback";
import { useAuth } from "../components/auth/AuthProvider";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Field,
  Input,
  ListSkeleton,
  Modal,
  ModalFooter,
  PageHeader,
  SearchSelect,
} from "../components/ui";

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function accountGroup(client: Client) {
  const categories = client.categories ?? [];
  if (categories.includes("CHILD_DISABILITY")) return "ребенок-инвалид";
  if (categories.some((item) => item.startsWith("DISABILITY_"))) return "инвалид";
  if (categories.includes("OJD")) return "ОЖД";
  if (categories.includes("OVZ")) return "ОВЗ";
  return "";
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function filenameFromHeader(header: unknown, fallback: string) {
  if (typeof header !== "string") return fallback;
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return fallback;
    }
  }
  const plain = header.match(/filename="?([^"]+)"?/i);
  return plain?.[1] ?? fallback;
}

async function renderErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { error?: unknown };
      const payload = parsed.error;
      if (typeof payload === "string") return payload;
      if (payload && typeof payload === "object" && "message" in payload) {
        const message = (payload as { message?: unknown }).message;
        if (typeof message === "string") return message;
      }
    } catch {
      /* keep fallback */
    }
  }
  return mutationErrorMessage(error);
}

function isDateKey(key: string) {
  return key === "BIRTH" || key === "DATE" || key.endsWith("_DATE") || key.endsWith("_BIRTH");
}

function adminName(user: { employeeFullName?: string | null; employeeName?: string | null; username?: string } | null) {
  return user?.employeeFullName?.trim() || user?.employeeName?.trim() || user?.username?.trim() || "";
}

function defaultValueForKey(key: string, admin: string) {
  if (key === "DATE") return todayYmd();
  if (key === "ADMIN") return admin;
  if (key === "CITIZENSHIP") return "РФ";
  return "";
}

export function DocumentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [settings, setSettings] = useState(false);
  const [clientId, setClientId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const setValue = (key: string, value: string) => {
    setReady(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const clientsQ = useQuery({
    queryKey: ["clients"],
    queryFn: () => resources.clients.list() as Promise<Client[]>,
    enabled: !settings,
  });
  const templatesQ = useQuery({
    queryKey: ["document-templates"],
    queryFn: () => resources.documentTemplates.list() as Promise<DocumentTemplate[]>,
    enabled: !settings,
  });
  const variablesQ = useQuery({
    queryKey: ["document-variables"],
    queryFn: () => resources.documentTemplates.variables() as Promise<DocumentVariable[]>,
    enabled: !settings,
  });

  const clients = (clientsQ.data ?? []).filter((client) => client.isActive);
  const templates = templatesQ.data ?? [];
  const variables = variablesQ.data ?? [];
  const name = (values.FIO ?? "").trim();

  useEffect(() => {
    if (!variables.length) return;
    const admin = adminName(user);
    setValues((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of variables) {
        if (next[item.key] === undefined) {
          next[item.key] = defaultValueForKey(item.key, admin);
          changed = true;
        }
      }
      if (admin && !next.ADMIN?.trim() && variables.some((item) => item.key === "ADMIN")) {
        next.ADMIN = admin;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [variables, user]);

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.fullName,
        hint: client.phone ?? undefined,
      })),
    [clients],
  );

  const pickClient = (id: string) => {
    setReady(false);
    setClientId(id);
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    const group = accountGroup(client);
    setValues((prev) => ({
      ...prev,
      FIO: client.fullName ?? "",
      FIO_SHORT: "",
      PHONE: client.phone ?? "",
      BIRTH: client.birthDate ? client.birthDate.slice(0, 10) : "",
      GROUP: group,
      ADDRESS: prev.ADDRESS?.trim() ? prev.ADDRESS : "г. Примерск, ул. Демонстрационная, д. 1",
      EMAIL: prev.EMAIL ?? "",
      LEGAL_REP: prev.LEGAL_REP ?? "",
    }));
  };

  // Надёжный синк полей при выборе клиента (на случай гонки с загрузкой переменных)
  useEffect(() => {
    if (!clientId || !clients.length) return;
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;
    setValues((prev) => {
      if (prev.FIO === client.fullName && (prev.PHONE || "") === (client.phone ?? "")) {
        return prev;
      }
      const group = accountGroup(client);
      return {
        ...prev,
        FIO: client.fullName ?? "",
        PHONE: client.phone ?? "",
        BIRTH: client.birthDate ? client.birthDate.slice(0, 10) : "",
        GROUP: group || prev.GROUP || "",
        ADDRESS: prev.ADDRESS?.trim() ? prev.ADDRESS : "г. Примерск, ул. Демонстрационная, д. 1",
      };
    });
  }, [clientId, clients]);

  const download = useMutation({
    mutationFn: async (payload: { templateId?: string; merge?: boolean }) => {
      const response = await resources.documentTemplates.render({
        clientId: clientId || undefined,
        values,
        ...payload,
      });
      return { data: response.data as Blob, headers: response.headers as Record<string, unknown> };
    },
    onSuccess: ({ data, headers }, vars) => {
      const fallback =
        vars.merge || !vars.templateId
          ? `${name || "документ"} — документы.docx`
          : `${name || "документ"} — ${templates.find((item) => item.id === vars.templateId)?.title ?? "документ"}.docx`;
      downloadBlob(data, filenameFromHeader(headers["content-disposition"], fallback));
    },
    onError: async (e) => {
      toast({ tone: "error", title: "Не удалось скачать", message: await renderErrorMessage(e) });
    },
  });

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Документы"
        action={
          settings ? (
            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setSettings(false)}>
              Назад
            </Button>
          ) : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setSettings(true)}>
                Настройки
              </Button>
              <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setTemplatesOpen(true)}>
                Шаблоны
              </Button>
            </div>
          )
        }
      />

      {settings ? (
        <VariablesSettings />
      ) : (
        <>
          <Card className="mb-5 p-4 sm:p-5">
            <div className="mb-3">
              <Field label="Клиент из базы">
                <SearchSelect
                  value={clientId}
                  onChange={pickClient}
                  options={clientOptions}
                  placeholder="Найти клиента…"
                  searchPlaceholder="ФИО или телефон"
                  emptyText="Клиент не найден"
                />
              </Field>
            </div>
            {variablesQ.isLoading ? (
              <ListSkeleton rows={6} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {variables.map((item) => (
                  <Field key={item.id} label={item.label}>
                    {isDateKey(item.key) ? (
                      <DatePicker value={values[item.key] ?? ""} onChange={(value) => setValue(item.key, value)} />
                    ) : (
                      <Input
                        value={values[item.key] ?? ""}
                        onChange={(e) => {
                          setValue(item.key, e.target.value);
                          if (item.key === "FIO" && !e.target.value.trim()) setClientId("");
                        }}
                        autoComplete="off"
                      />
                    )}
                  </Field>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button className="w-full sm:w-auto" onClick={() => setReady(true)}>
                Сгенерировать документы
              </Button>
            </div>
          </Card>

          {templatesQ.isLoading ? (
            <Card className="p-4">
              <ListSkeleton rows={3} />
            </Card>
          ) : !ready ? (
            <Card className="p-6">
              <Empty text="Нажмите «Сгенерировать документы»." />
            </Card>
          ) : templates.length === 0 ? (
            <Card className="p-6">
              <Empty text="Шаблоны ещё не загружены." />
            </Card>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="flex min-w-min gap-3 pb-2">
                {templates.length > 1 && (
                  <button
                    type="button"
                    disabled={download.isPending}
                    onClick={() => download.mutate({ merge: true })}
                    className="flex h-28 w-44 shrink-0 flex-col justify-between rounded-3xl border border-brand-soft bg-brand-light px-4 py-3 text-left shadow-sm transition-colors hover:bg-brand/10 disabled:opacity-50"
                  >
                    <span className="text-xs font-medium text-brand-dark">Для печати</span>
                    <span className="text-sm font-semibold leading-snug text-ink">Все одним файлом</span>
                  </button>
                )}
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={download.isPending}
                    onClick={() => download.mutate({ templateId: template.id, merge: false })}
                    className="flex h-28 w-44 shrink-0 flex-col justify-between rounded-3xl border border-line bg-panel px-4 py-3 text-left shadow-card transition-colors hover:border-brand-soft hover:bg-surface disabled:opacity-50"
                  >
                    <span className="text-xs font-medium text-ink-muted">Word</span>
                    <span className="line-clamp-3 text-sm font-semibold leading-snug text-ink">{template.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["document-templates"] })}
      />
    </div>
  );
}

function VariablesSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const listQ = useQuery({
    queryKey: ["document-variables"],
    queryFn: () => resources.documentTemplates.variables() as Promise<DocumentVariable[]>,
  });
  const items = listQ.data ?? [];

  const add = useMutation({
    mutationFn: () =>
      resources.documentTemplates.createVariable({
        key: newKey,
        label: newLabel.trim() || newKey.trim(),
      }),
    onSuccess: () => {
      setNewKey("");
      setNewLabel("");
      qc.invalidateQueries({ queryKey: ["document-variables"] });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось добавить", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => resources.documentTemplates.removeVariable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-variables"] }),
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  return (
    <Card className="p-4 sm:p-5">
      {listQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{item.label}</div>
                <div className="font-mono text-[11px] text-ink-muted">{`{{${item.key}}}`}</div>
              </div>
              <Button
                variant="danger"
                className="h-8 shrink-0 px-3 text-xs"
                disabled={remove.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Удалить переменную?",
                    message: `{{${item.key}}}`,
                    confirmText: "Удалить",
                    danger: true,
                  });
                  if (ok) remove.mutate(item.id);
                }}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <Field label="Ключ">
          <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="{{FIO}}" autoComplete="off" />
        </Field>
        <Field label="Название">
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="ФИО" autoComplete="off" />
        </Field>
        <Button className="w-full sm:w-auto" disabled={!newKey.trim() || add.isPending} onClick={() => add.mutate()}>
          Добавить
        </Button>
      </div>
    </Card>
  );
}

function TemplatesModal({
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
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const listQ = useQuery({
    queryKey: ["document-templates"],
    queryFn: () => resources.documentTemplates.list() as Promise<DocumentTemplate[]>,
    enabled: open,
  });
  const items = listQ.data ?? [];

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Выберите файл .docx");
      const data = new FormData();
      data.append("file", file);
      if (title.trim()) data.append("title", title.trim());
      return resources.documentTemplates.create(data);
    },
    onSuccess: () => {
      setTitle("");
      setFile(null);
      onChanged();
      toast({ tone: "success", title: "Шаблон загружен" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось загрузить", message: mutationErrorMessage(e) }),
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      resources.documentTemplates.update(id, { title }),
    onSuccess: () => {
      setEditingId(null);
      onChanged();
      toast({ tone: "success", title: "Название обновлено" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => resources.documentTemplates.remove(id),
    onSuccess: () => {
      onChanged();
      toast({ tone: "success", title: "Шаблон удалён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  return (
    <Modal open={open} title="Шаблоны Word" onClose={onClose} panelClassName="max-w-xl">
      <div className="mb-5 space-y-3 rounded-2xl border border-line bg-surface/50 p-3">
        <Field label="Название">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Согласие, договор…" />
        </Field>
        <Field label="Файл .docx">
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full text-sm text-ink file:mr-3 file:rounded-xl file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Button className="w-full" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? "Загрузка…" : "Добавить шаблон"}
        </Button>
      </div>

      {listQ.isLoading ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <Empty text="Пока нет шаблонов" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-line px-3 py-2.5">
              {editingId === item.id ? (
                <div className="space-y-2">
                  <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                  <ModalFooter
                    cancelText="Отмена"
                    submitText="Сохранить"
                    submitDisabled={!editingTitle.trim() || rename.isPending}
                    onCancel={() => setEditingId(null)}
                    onSubmit={() => rename.mutate({ id: item.id, title: editingTitle.trim() })}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{item.title}</div>
                    <div className="truncate text-[11px] text-ink-muted">{item.fileName}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingTitle(item.title);
                      }}
                    >
                      Переименовать
                    </Button>
                    <Button
                      variant="danger"
                      className="h-8 px-3 text-xs"
                      disabled={remove.isPending}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Удалить шаблон?",
                          message: item.title,
                          confirmText: "Удалить",
                          danger: true,
                        });
                        if (ok) remove.mutate(item.id);
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

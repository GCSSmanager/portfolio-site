import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatServiceName } from "../../lib/service-label";
import { resources } from "../../lib/resources";
import type { Service } from "../../lib/types";
import { Button, Card, ChoiceGroup, Empty, Field, Input, ListSkeleton, Modal, ModalFooter, Picker, Table, Td, Th } from "../../components/ui";
import { mutationErrorMessage, useConfirm, useToast } from "../../components/feedback";

export function ServicesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data = [], isLoading } = useQuery({ queryKey: ["services", "all"], queryFn: () => resources.services.list() });
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["services"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const save = useMutation({
    mutationFn: (p: { id?: string; data: Partial<Service> }) =>
      p.id ? resources.services.update(p.id, p.data) : resources.services.create(p.data),
    onSuccess: (_, vars) => { invalidate(); setEditing(null); setCreating(false); toast({ tone: "success", title: vars.id ? "Услуга обновлена" : "Услуга создана" }); },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: resources.services.remove,
    onSuccess: () => { invalidate(); toast({ tone: "success", title: "Услуга удалена" }); },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const confirmRemove = async (service: Service) => {
    const ok = await confirm({
      title: "Удалить услугу?",
      message: `«${service.name}» будет удалена из базы вместе со связанными записями в расписании.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate(service.id);
  };

  if (isLoading) return <Card className="p-4"><ListSkeleton rows={6} /></Card>;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
          + Услуга
        </Button>
      </div>
      <Card>
        {data.length === 0 ? (
          <Empty text="Нет услуг" />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {data.map((s: Service) => (
                <div key={s.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{formatServiceName(s)}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">
                        {s.durationMin} мин · {s.isGroup ? "групповое" : "индивидуально"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setEditing(s)}>
                      Изменить
                    </Button>
                    <Button variant="danger" className="!h-10 min-w-0 !text-sm" onClick={() => confirmRemove(s)}>
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
                    <Th>Длительность</Th>
                    <Th>Тип</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {data.map((s: Service) => (
                    <tr key={s.id} className="hover:bg-surface/60">
                      <Td>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {formatServiceName(s)}
                        </span>
                      </Td>
                      <Td>{s.durationMin} мин</Td>
                      <Td className="text-ink-muted">{s.isGroup ? "групповое" : "индивидуально"}</Td>
                      <Td className="space-x-2 text-right">
                        <Button variant="ghost" className="!h-8 !px-3" onClick={() => setEditing(s)}>
                          Изменить
                        </Button>
                        <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemove(s)}>
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
      <ServiceForm
        open={creating || !!editing}
        item={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(data) => save.mutate({ id: editing?.id, data })}
        loading={save.isPending}
      />
    </>
  );
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90].map((v) => ({ value: String(v), label: `${v} мин` }));

function ServiceForm({
  open,
  item,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  item: Service | null;
  onClose: () => void;
  onSave: (d: Partial<Service>) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [color, setColor] = useState("#52944d");
  const [serviceKind, setServiceKind] = useState<"individual" | "group">("individual");
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(item?.name ?? "");
      setDurationMin(item?.durationMin ?? 30);
      setColor(item?.color ?? "#52944d");
      setServiceKind(item?.isGroup ? "group" : "individual");
    }
  }

  return (
    <Modal open={open} title={item ? "Редактировать услугу" : "Новая услуга"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Название">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Длительность">
            <Picker
              value={String(durationMin)}
              onChange={(v) => setDurationMin(Number(v))}
              options={DURATION_OPTIONS}
              placeholder="Выберите длительность"
            />
          </Field>
          <Field label="Цвет">
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="!h-9 !p-1" />
          </Field>
        </div>
        <Field label="Тип занятия">
          <ChoiceGroup
            value={serviceKind}
            onChange={setServiceKind}
            options={[
              { value: "individual", label: "Индивидуально" },
              { value: "group", label: "Групповое" },
            ]}
          />
        </Field>
        <ModalFooter
          onCancel={onClose}
          onSubmit={() =>
            onSave({
              name,
              durationMin,
              color,
              isGroup: serviceKind === "group",
            })
          }
          submitDisabled={loading || !name}
        />
      </div>
    </Modal>
  );
}

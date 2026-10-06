import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resources } from "../../lib/resources";
import type { Room } from "../../lib/types";
import { Button, Card, Empty, Field, Input, ListSkeleton, Modal, ModalFooter, Table, Td, Th } from "../../components/ui";
import { mutationErrorMessage, useConfirm, useToast } from "../../components/feedback";

export function RoomsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data = [], isLoading } = useQuery({ queryKey: ["rooms", "all"], queryFn: () => resources.rooms.list() });
  const [editing, setEditing] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("1");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rooms"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const capacityNum = Number(capacity);
  const capacityOk = Number.isInteger(capacityNum) && capacityNum >= 1 && capacityNum <= 50;

  const save = useMutation({
    mutationFn: (p: { id?: string; name: string; capacity: number }) =>
      p.id
        ? resources.rooms.update(p.id, { name: p.name, capacity: p.capacity })
        : resources.rooms.create({ name: p.name, capacity: p.capacity }),
    onSuccess: (_, vars) => {
      invalidate();
      setEditing(null);
      setCreating(false);
      setName("");
      setCapacity("1");
      toast({ tone: "success", title: vars.id ? "Кабинет обновлён" : "Кабинет создан" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: resources.rooms.remove,
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Кабинет удалён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const openForm = (room?: Room) => {
    setName(room?.name ?? "");
    setCapacity(String(room?.capacity ?? 1));
    room ? setEditing(room) : setCreating(true);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmRemove = async (room: Room) => {
    const ok = await confirm({
      title: "Удалить кабинет?",
      message: `«${room.name}» будет удалён из базы. У записей в расписании кабинет будет снят.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate(room.id);
  };

  if (isLoading) return <Card className="p-4"><ListSkeleton rows={6} /></Card>;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="w-full sm:w-auto" onClick={() => openForm()}>
          + Кабинет
        </Button>
      </div>
      <Card>
        {data.length === 0 ? (
          <Empty text="Нет кабинетов" />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {data.map((r: Room) => (
                <div key={r.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                  <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {(r.capacity ?? 1) > 1 ? `${r.capacity} места` : "1 место"}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => openForm(r)}>
                      Изменить
                    </Button>
                    <Button variant="danger" className="!h-10 min-w-0 !text-sm" onClick={() => confirmRemove(r)}>
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
                    <Th>Мест</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {data.map((r: Room) => (
                    <tr key={r.id} className="hover:bg-surface/60">
                      <Td>{r.name}</Td>
                      <Td className="tabular-nums text-ink-muted">{r.capacity ?? 1}</Td>
                      <Td className="space-x-2 text-right">
                        <Button variant="ghost" className="!h-8 !px-3" onClick={() => openForm(r)}>
                          Изменить
                        </Button>
                        <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemove(r)}>
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
      <Modal open={creating || !!editing} title={editing ? "Редактировать кабинет" : "Новый кабинет"} onClose={closeForm}>
        <div className="space-y-4">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Число мест">
            <Input
              type="number"
              min={1}
              max={50}
              step={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Сколько занятий одновременно.
            </p>
          </Field>
          <ModalFooter
            onCancel={closeForm}
            onSubmit={() => save.mutate({ id: editing?.id, name, capacity: capacityNum })}
            submitDisabled={!name || !capacityOk || save.isPending}
          />
        </div>
      </Modal>
    </>
  );
}

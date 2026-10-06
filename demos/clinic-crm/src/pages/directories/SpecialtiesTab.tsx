import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resources } from "../../lib/resources";
import type { Specialty } from "../../lib/types";
import { Button, Card, Empty, Field, Input, ListSkeleton, Modal, ModalFooter, Table, Td, Th } from "../../components/ui";
import { mutationErrorMessage, useConfirm, useToast } from "../../components/feedback";

export function SpecialtiesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data = [], isLoading } = useQuery({
    queryKey: ["specialties"],
    queryFn: () => resources.specialties.list() as Promise<Specialty[]>,
  });
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["specialties"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const save = useMutation({
    mutationFn: (p: { id?: string; name: string }) =>
      p.id ? resources.specialties.update(p.id, { name: p.name }) : resources.specialties.create({ name: p.name }),
    onSuccess: (_, vars) => {
      invalidate();
      setEditing(null);
      setCreating(false);
      setName("");
      toast({ tone: "success", title: vars.id ? "Специальность обновлена" : "Специальность создана" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: resources.specialties.remove,
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Специальность удалена" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const openForm = (specialty?: Specialty) => {
    setName(specialty?.name ?? "");
    specialty ? setEditing(specialty) : setCreating(true);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmRemove = async (specialty: Specialty) => {
    const ok = await confirm({
      title: "Удалить специальность?",
      message: `«${specialty.name}» будет удалена. У специалистов поле специальности станет пустым.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate(specialty.id);
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <ListSkeleton rows={6} />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="w-full sm:w-auto" onClick={() => openForm()}>
          + Специальность
        </Button>
      </div>
      <Card>
        {data.length === 0 ? (
          <Empty text="Нет специальностей" />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {data.map((item) => (
                <div key={item.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                  <div className="truncate text-sm font-semibold text-ink">{item.name}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => openForm(item)}>
                      Изменить
                    </Button>
                    <Button variant="danger" className="!h-10 min-w-0 !text-sm" onClick={() => confirmRemove(item)}>
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
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-surface/60">
                      <Td>{item.name}</Td>
                      <Td className="space-x-2 text-right">
                        <Button variant="ghost" className="!h-8 !px-3" onClick={() => openForm(item)}>
                          Изменить
                        </Button>
                        <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemove(item)}>
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
      <Modal
        open={creating || !!editing}
        title={editing ? "Редактировать специальность" : "Новая специальность"}
        onClose={closeForm}
      >
        <div className="space-y-4">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Логопед, АФК…" />
          </Field>
          <ModalFooter
            onCancel={closeForm}
            onSubmit={() => save.mutate({ id: editing?.id, name: name.trim() })}
            submitDisabled={!name.trim() || save.isPending}
          />
        </div>
      </Modal>
    </>
  );
}

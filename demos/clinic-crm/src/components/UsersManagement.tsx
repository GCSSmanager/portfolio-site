import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resources } from "../lib/resources";
import type { Employee } from "../lib/types";
import type { UserRole } from "../lib/roles";
import { ROLE_LABELS } from "../lib/roles";
import { mutationErrorMessage, useConfirm, useToast } from "./feedback";
import { Button, Card, Empty, Field, Input, Modal, ModalFooter, SearchSelect, Table, Td, Th } from "./ui";

interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  employeeId?: string | null;
  employee?: Pick<Employee, "id" | "shortName" | "fullName"> | null;
}

export function UsersManagement() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const usersQ = useQuery({ queryKey: ["users"], queryFn: () => resources.users.list() as Promise<AppUser[]> });
  const employeesQ = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => resources.employees.list() as Promise<Employee[]>,
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetFor, setResetFor] = useState<AppUser | null>(null);

  const users = usersQ.data ?? [];

  const linkedEmployeeIds = useMemo(
    () => new Set(users.filter((user) => user.employeeId).map((user) => user.employeeId!)),
    [users],
  );

  const freeEmployees = useMemo(
    () => (employeesQ.data ?? []).filter((employee) => !linkedEmployeeIds.has(employee.id)),
    [employeesQ.data, linkedEmployeeIds],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const createUser = useMutation({
    mutationFn: (data: Record<string, unknown>) => resources.users.create(data),
    onSuccess: () => {
      setCreating(false);
      invalidate();
      toast({ tone: "success", title: "Пользователь создан" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось создать", message: mutationErrorMessage(e) }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => resources.users.update(id, data),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast({ tone: "success", title: "Пользователь обновлён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось обновить", message: mutationErrorMessage(e) }),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resources.users.resetPassword(id, password),
    onSuccess: () => {
      setResetFor(null);
      toast({ tone: "success", title: "Пароль обновлён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось сменить пароль", message: mutationErrorMessage(e) }),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => resources.users.remove(id),
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Пользователь удалён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const confirmRemove = async (user: AppUser) => {
    const ok = await confirm({
      title: "Удалить пользователя?",
      message: user.username,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) removeUser.mutate(user.id);
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">Пользователи</h2>
          <p className="mt-1 text-sm text-ink-muted">Создание админов и специалистов, смена их паролей.</p>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={() => setCreating(true)}>
          + Пользователь
        </Button>
      </div>

      {usersQ.isLoading ? (
        <p className="py-8 text-center text-sm text-ink-muted">Загрузка…</p>
      ) : usersQ.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не удалось загрузить пользователей.
        </div>
      ) : users.length === 0 ? (
        <Empty text="Пользователей пока нет" />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {users.map((user) => {
              const isDirector = user.role === "DIRECTOR";
              return (
                <div key={user.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{user.username}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {ROLE_LABELS[user.role]}
                      {user.employee?.shortName ? ` · ${user.employee.shortName}` : ""}
                    </div>
                  </div>
                  {!isDirector && (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" className="!h-10 min-w-0 !px-3 !text-sm" onClick={() => setResetFor(user)}>
                          Пароль
                        </Button>
                        <Button variant="ghost" className="!h-10 min-w-0 !px-3 !text-sm" onClick={() => setEditing(user)}>
                          Изменить
                        </Button>
                      </div>
                      <Button variant="danger" className="!h-10 w-full !text-sm" onClick={() => confirmRemove(user)}>
                        Удалить
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Логин</Th>
                  <Th>Роль</Th>
                  <Th>Специалист</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isDirector = user.role === "DIRECTOR";
                  return (
                    <tr key={user.id} className="hover:bg-surface/60">
                      <Td>{user.username}</Td>
                      <Td>{ROLE_LABELS[user.role]}</Td>
                      <Td className="text-ink-muted">{user.employee?.shortName ?? "—"}</Td>
                      <Td className="space-x-2 whitespace-nowrap text-right">
                        {!isDirector && (
                          <>
                            <Button variant="ghost" className="!h-8 !px-3" onClick={() => setResetFor(user)}>
                              Пароль
                            </Button>
                            <Button variant="ghost" className="!h-8 !px-3" onClick={() => setEditing(user)}>
                              Изменить
                            </Button>
                            <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemove(user)}>
                              Удалить
                            </Button>
                          </>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}

      <UserFormModal
        open={creating}
        title="Новый пользователь"
        employees={freeEmployees}
        onClose={() => {
          if (!createUser.isPending) setCreating(false);
        }}
        onSubmit={(data) => createUser.mutate(data)}
        loading={createUser.isPending}
      />

      <UserFormModal
        open={!!editing}
        title="Редактировать пользователя"
        user={editing}
        employees={employeesQ.data ?? []}
        linkedEmployeeIds={linkedEmployeeIds}
        onClose={() => {
          if (!updateUser.isPending) setEditing(null);
        }}
        onSubmit={(data) => editing && updateUser.mutate({ id: editing.id, data })}
        loading={updateUser.isPending}
      />

      <ResetPasswordModal
        user={resetFor}
        onClose={() => {
          if (!resetPassword.isPending) setResetFor(null);
        }}
        onSubmit={(password) => resetFor && resetPassword.mutate({ id: resetFor.id, password })}
        loading={resetPassword.isPending}
      />
    </Card>
  );
}

type CreatableRole = Extract<UserRole, "ADMIN" | "SPECIALIST">;

function UserFormModal({
  open,
  title,
  user,
  employees,
  linkedEmployeeIds,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  title: string;
  user?: AppUser | null;
  employees: Employee[];
  linkedEmployeeIds?: Set<string>;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CreatableRole>("ADMIN");
  const [employeeId, setEmployeeId] = useState("");
  const isDirector = user?.role === "DIRECTOR";

  useEffect(() => {
    if (!open) return;
    setUsername(user?.username ?? "");
    setPassword("");
    setRole(user?.role === "SPECIALIST" ? "SPECIALIST" : "ADMIN");
    setEmployeeId(user?.employeeId ?? "");
  }, [open, user]);

  const employeeOptions = employees
    .filter((employee) => !linkedEmployeeIds || !linkedEmployeeIds.has(employee.id) || employee.id === user?.employeeId)
    .map((employee) => ({ value: employee.id, label: employee.shortName }));

  const save = () => {
    onSubmit({
      username,
      ...(user ? {} : { password }),
      role,
      employeeId: role === "SPECIALIST" ? employeeId : null,
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    save();
  };

  const canSave = !loading && !isDirector && !!username && (!!user || password.length >= 4) && (role !== "SPECIALIST" || !!employeeId);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Логин">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </Field>
        {!user && (
          <Field label="Пароль">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        )}
        <Field label="Роль">
          <SearchSelect
            value={role}
            onChange={(value) => setRole(value as CreatableRole)}
            options={[
              { value: "ADMIN", label: ROLE_LABELS.ADMIN },
              { value: "SPECIALIST", label: ROLE_LABELS.SPECIALIST },
            ]}
          />
        </Field>
        {role === "SPECIALIST" && (
          <Field label="Специалист из справочника">
            <SearchSelect
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Выберите специалиста"
              options={employeeOptions}
            />
          </Field>
        )}
        <ModalFooter
          onCancel={onClose}
          onSubmit={save}
          submitDisabled={!canSave}
          submitText={loading ? "Сохраняем…" : user ? "Сохранить" : "Создать"}
        />
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onSubmit,
  loading,
}: {
  user: AppUser | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
  loading: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setPassword("");
    setConfirmPassword("");
  }, [user]);

  const save = () => {
    if (password !== confirmPassword) return;
    onSubmit(password);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    save();
  };

  const canSave = !loading && password.length >= 4 && password === confirmPassword;

  return (
    <Modal open={!!user} title={user ? `Новый пароль · ${user.username}` : "Новый пароль"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Новый пароль">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Повторите пароль">
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {password && confirmPassword && password !== confirmPassword && (
          <div className="text-sm text-red-700">Пароли не совпадают</div>
        )}
        <ModalFooter
          onCancel={onClose}
          onSubmit={save}
          submitDisabled={!canSave}
          submitText={loading ? "Сохраняем…" : "Сменить пароль"}
        />
      </form>
    </Modal>
  );
}

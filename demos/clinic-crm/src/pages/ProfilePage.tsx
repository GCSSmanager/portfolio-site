import { FormEvent, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { mutationErrorMessage, useToast } from "../components/feedback";
import { isSpecialist } from "../lib/roles";
import { Button, Card, Field, Input, PageHeader } from "../components/ui";

export function ProfilePage() {
  const { user, changePassword, logout } = useAuth();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const employeeDeleted = !!user && isSpecialist(user.role) && user.employeeActive === false;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Новый пароль и подтверждение не совпадают");
      return;
    }

    setPending(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ tone: "success", title: "Пароль обновлен" });
    } catch (e) {
      setError(mutationErrorMessage(e, "Не удалось изменить пароль"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-4xl p-4 sm:p-6">
      <PageHeader title="Профиль" />

      <Card className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5 sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm text-ink-muted">Вы вошли как</div>
            <div className="mt-1 truncate text-lg font-semibold text-ink">{user?.username}</div>
          </div>
          <Button variant="ghost" onClick={logout}>Выйти</Button>
        </div>

        {employeeDeleted && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Свяжитесь с администратором: специалист удалён из системы.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Смена пароля</h2>
            <p className="mt-1 text-sm text-ink-muted">Смена своего пароля. Остальные сессии будут сброшены.</p>
          </div>

          <Field label="Текущий пароль">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field label="Новый пароль">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Повторите новый пароль">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !currentPassword || !newPassword || !confirmPassword}>
              {pending ? "Сохраняем…" : "Сменить пароль"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

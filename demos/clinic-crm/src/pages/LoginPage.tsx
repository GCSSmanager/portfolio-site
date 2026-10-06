import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../components/auth/AuthProvider";
import { mutationErrorMessage } from "../components/feedback";
import { SiteBackBadge } from "../components/layout/SiteBackBadge";
import { DEMO_ACCOUNTS } from "../demo/accounts";
import { ROLE_LABELS } from "../lib/roles";
import { Button, Field, Input } from "../components/ui";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(DEMO_ACCOUNTS[0]!.username);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0]!.password);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (user) return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(mutationErrorMessage(e, "Не удалось войти"));
    } finally {
      setPending(false);
    }
  };

  const fillAccount = (loginName: string, pass: string) => {
    setUsername(loginName);
    setPassword(pass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={submit} className="rounded-3xl border border-line bg-panel p-6 shadow-card">
          <div className="mb-6">
            <div className="w-11 h-11 rounded-2xl bg-brand flex items-center justify-center text-white font-bold text-base shadow-float">
              К
            </div>
            <h1 className="mt-4 text-xl font-semibold text-ink tracking-tight">Демо CRM клиники</h1>
            <p className="mt-1 text-sm text-ink-muted">Выберите роль ниже или войдите с подставленными данными.</p>
          </div>

          <div className="space-y-4">
            <Field label="Логин">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Пароль">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </Field>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <Button type="submit" className="w-full" disabled={pending || !username || !password}>
              {pending ? "Входим…" : "Войти"}
            </Button>
          </div>
        </form>

        <div className="rounded-3xl border border-line bg-panel p-5 shadow-card">
          <div className="text-sm font-semibold text-ink">Тестовые доступы</div>
          <p className="mt-1 text-xs text-ink-muted">Нажмите строку — подставим логин и пароль.</p>
          <ul className="mt-3 divide-y divide-line">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.username}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  onClick={() => fillAccount(account.username, account.password)}
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{account.label}</div>
                    <div className="text-[11px] text-ink-muted">{ROLE_LABELS[account.role]}</div>
                  </div>
                  <div className="font-mono text-[11px] text-ink-muted sm:text-right">
                    {account.username} / {account.password}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <SiteBackBadge />
    </div>
  );
}


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import { submitButtonClass } from '@/lib/formSubmitStyle';
import { DEMO_ACCOUNTS } from '@/demo/accounts';
import { getProject } from '@/lib/projects';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const [loginStr, setLoginStr] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const canSubmit = loginStr.trim().length > 0 && password.trim().length > 0;
  const project = getProject('pest-control');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    setLocalError(null);

    if (!canSubmit) { setLocalError('Введите логин и пароль'); return; }

    setIsSubmitting(true);
    try {
      await login(loginStr, password);
      navigate('/', { replace: true });
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pest-login-screen">
      <div className="pest-login-screen__inner">
        <div className="mb-6 flex flex-col items-center gap-3 text-center sm:mb-8">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-500/25">
            <span className="text-2xl text-white">{project.icon}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{project.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Демо на сайте ГКСС — данные только в вашем браузере</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900">Вход</h2>
            <p className="mt-1 text-sm text-gray-500">Те же роли, что в продукте: admin, operator, master</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {(localError || error) && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <span>{localError || error}</span>
                </div>
              )}

              <Input
                label="Логин"
                value={loginStr}
                onChange={e => setLoginStr(e.target.value)}
                placeholder="admin"
                autoFocus
                disabled={isSubmitting}
                error={showValidation && !loginStr.trim() ? 'Обязательное поле' : undefined}
              />

              <Input
                label="Пароль"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                error={showValidation && !password.trim() ? 'Обязательное поле' : undefined}
              />

              <Button
                type="submit"
                variant="success"
                className={submitButtonClass(canSubmit, 'w-full py-3')}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Войти
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900">Тестовые доступы</h2>
            <p className="mt-1 text-sm text-gray-500">Нажмите строку — подставим логин и пароль</p>
            <ul className="mt-5 space-y-2">
              {DEMO_ACCOUNTS.map(acc => (
                <li key={acc.login}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    onClick={() => {
                      setLoginStr(acc.login);
                      setPassword(acc.password);
                    }}
                  >
                    <span className="text-sm font-medium text-gray-900">{acc.label}</span>
                    <span className="font-mono text-xs text-gray-600 sm:text-sm">
                      {acc.login} / {acc.password}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Button from '@/components/UI/Button';
import TaskModal from '@/components/Tasks/TaskModal';
import ClickToCallPhone from '@/components/UI/ClickToCallPhone';
import { api, Task, TaskEmailStatus } from '@/lib/api';

type TaskTab = 'active' | 'completed';

const formatDateTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function TasksContent() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaskTab>('active');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<TaskEmailStatus | null>(null);

  const loadTasks = async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      const data = await api.getTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadEmailStatus = async () => {
    try {
      const data = await api.getTaskEmailStatus();
      setEmailStatus(data);
    } catch (err) {
      console.error('Failed to load email status:', err);
    }
  };

  useEffect(() => {
    loadTasks();
    loadEmailStatus();
  }, []);

  useEffect(() => {
    if (isTaskModalOpen) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadTasks(true);
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [isTaskModalOpen]);

  const activeTasks = tasks
    .filter(task => !task.completed)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const completedTasks = tasks
    .filter(task => task.completed)
    .sort((a, b) => {
      const left = new Date(b.completedAt || b.updatedAt).getTime();
      const right = new Date(a.completedAt || a.updatedAt).getTime();
      return left - right;
    });

  const visibleTasks = activeTab === 'active' ? activeTasks : completedTasks;

  const openCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">Задачи</h1>
              <p className="text-xs text-gray-500">Контроль задач по заказам и операторам</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadTasks()}
              disabled={isLoading}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              title="Обновить"
            >
              <svg className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <Button onClick={openCreateTask} variant="success" className="hidden sm:inline-flex">
              Добавить задачу
            </Button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-2">
          <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
            Активные: {activeTasks.length}
          </div>
          <div className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">
            Выполненные: {completedTasks.length}
          </div>
          <Button onClick={openCreateTask} variant="success" className="sm:hidden ml-auto">
            Добавить
          </Button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-[69px] sm:top-[73px] z-20">
        <div className="flex rounded-xl bg-gray-100 p-1 max-w-5xl mx-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Задачи ({activeTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Выполнены ({completedTasks.length})
          </button>
        </div>
      </div>

      <main className="p-4 max-w-5xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {emailStatus && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
            !emailStatus.enabled
              ? 'border-gray-200 bg-gray-50 text-gray-700'
              : emailStatus.canReceiveReminders
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {!emailStatus.enabled ? (
              <span>
                Email-напоминания по задачам отключены: SMTP не настроен на сервере.
              </span>
            ) : emailStatus.canReceiveReminders ? (
              <span>
                Email-напоминания по задачам включены. Письма будут приходить на {emailStatus.email}.
              </span>
            ) : (
              <span>
                У вашего пользователя не заполнен email. Администратор должен добавить адрес в разделе пользователей, иначе напоминания по задачам не отправятся.
              </span>
            )}
          </div>
        )}

        {isLoading && visibleTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-500 animate-spin" />
            <p className="mt-4 text-gray-500 font-medium">Загрузка задач...</p>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {activeTab === 'active' ? 'Нет открытых задач' : 'Нет выполненных задач'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'active'
                ? 'Добавьте первую задачу через кнопку сверху.'
                : 'Выполненные задачи появятся здесь после закрытия.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {visibleTasks.map(task => {
              const isOverdue = !task.completed && new Date(task.deadline).getTime() < Date.now();
              const isCompleted = task.completed;

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task)}
                  className={`text-left w-full rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-md active:scale-[0.99] ${
                    isCompleted
                      ? 'bg-gray-50 border-gray-200'
                      : isOverdue
                        ? 'bg-red-50 border-red-300'
                        : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold text-gray-900 text-lg">Задача #{task.taskNumber}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          isCompleted
                            ? 'bg-gray-200 text-gray-700'
                            : isOverdue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                        }`}>
                          {isCompleted ? 'Выполнена' : isOverdue ? 'Просрочена' : 'Активна'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Заказ:</span>
                          <span className="font-medium text-gray-900">{task.orderNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Ответственный:</span>
                          <span className="font-medium text-gray-900">{task.responsible}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Дедлайн:</span>
                          <span className={`font-medium ${
                            isCompleted
                              ? 'text-gray-900'
                              : isOverdue
                                ? 'text-red-700'
                                : 'text-green-700'
                          }`}>
                            {formatDateTime(task.deadline)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Телефон:</span>
                          <ClickToCallPhone
                            phone={task.phone}
                            className="font-medium"
                          />
                        </div>
                        {task.notifyAt && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <span className="text-gray-400">Email:</span>
                            <span className={`font-medium ${task.emailNotificationSentAt ? 'text-emerald-700' : 'text-gray-900'}`}>
                              {formatDateTime(task.notifyAt)}
                              {task.emailNotificationSentAt ? ' • отправлено' : ''}
                            </span>
                          </div>
                        )}
                        {isCompleted && task.completedAt && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <span className="text-gray-400">Выполнена:</span>
                            <span className="font-medium text-emerald-700">{formatDateTime(task.completedAt)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{task.comment}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={loadTasks}
        task={selectedTask}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'operator']}>
      <TasksContent />
    </ProtectedRoute>
  );
}

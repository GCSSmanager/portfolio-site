// src/components/Settings/SourcesModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import { api, Source } from '@/lib/api';
import { isProtectedSource } from '@/lib/protectedSources';
import { notifySourcesUpdated } from '@/demo/events';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SourcesModal({ isOpen, onClose }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const loadSources = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSources(showInactive);
      setSources(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShowValidation(false);
      loadSources();
    }
  }, [isOpen, showInactive]);

  const canAdd = newName.trim().length > 0;

  const handleAdd = async () => {
    setShowValidation(true);
    if (!canAdd) return;

    setError(null);
    setIsLoading(true);
    
    try {
      await api.createSource(newName.trim());
      setNewName('');
      await loadSources();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    const current = sources.find((s) => s.id === id);
    if (current && isProtectedSource(current.name)) {
      setError('Системный источник нельзя переименовать');
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      const newName = editingName.trim();
      const oldName = current?.name ?? '';
      await api.updateSource(id, { name: newName });
      setEditingId(null);
      setEditingName('');
      await loadSources();
      if (oldName && newName !== oldName) {
        notifySourcesUpdated({ oldName, newName });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (source: Source) => {
    if (isProtectedSource(source.name)) {
      setError('Системный источник нельзя деактивировать');
      return;
    }
    setError(null);
    try {
      await api.updateSource(source.id, { isActive: !source.isActive });
      await loadSources();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    const current = sources.find((s) => s.id === id);
    if (current && isProtectedSource(current.name)) {
      setError('Системный источник нельзя удалить');
      return;
    }
    if (!confirm('Удалить источник навсегда? Это действие нельзя отменить.')) return;
    
    setError(null);
    try {
      await api.deleteSource(id, true);
      await loadSources();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEditing = (source: Source) => {
    setEditingId(source.id);
    setEditingName(source.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Управление источниками" size="md">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Добавление нового источника */}
        <div className="flex gap-2">
          <Input
            label="Название *"
            placeholder="Название нового источника"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
            error={showValidation && !canAdd ? REQUIRED_FIELD_ERROR : undefined}
          />
          <Button
            onClick={handleAdd}
            variant="success"
            disabled={isLoading}
            className={submitButtonClass(canAdd, 'self-end shrink-0')}
          >
            Добавить
          </Button>
        </div>

        {/* Показать неактивных */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          Показать неактивные
        </label>

        {/* Список источников */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {isLoading && sources.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-green-500 animate-spin mx-auto mb-2"></div>
              Загрузка...
            </div>
          ) : sources.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Нет источников
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
              {sources.map((source) => (
                <li 
                  key={source.id} 
                  className={`p-3 flex items-center justify-between gap-3 ${
                    !source.isActive ? 'bg-gray-50 opacity-60' : ''
                  }`}
                >
                  {editingId === source.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(source.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(source.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${source.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className="font-medium text-gray-900">{source.name}</span>
                        {isProtectedSource(source.name) && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">системный</span>
                        )}
                        {!source.isActive && (
                          <span className="text-xs text-gray-400">(неактивен)</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!isProtectedSource(source.name) && (
                        <button
                          onClick={() => startEditing(source)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        )}
                        
                        {!isProtectedSource(source.name) && (
                        <button
                          onClick={() => handleToggleActive(source)}
                          className={`p-2 rounded-lg transition-colors ${
                            source.isActive 
                              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' 
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={source.isActive ? 'Деактивировать' : 'Активировать'}
                        >
                          {source.isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        )}
                        
                        {!source.isActive && !isProtectedSource(source.name) && (
                          <button
                            onClick={() => handleDelete(source.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить навсегда"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
}
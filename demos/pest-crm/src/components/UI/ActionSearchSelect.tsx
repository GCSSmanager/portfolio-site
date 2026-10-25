
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { activityActionLabel } from '@/lib/activityLabel';

interface Props {
  actions: string[];
  value: string;
  onChange: (action: string) => void;
}

export default function ActionSearchSelect({ actions, value, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter(action =>
      activityActionLabel(action).toLowerCase().includes(needle)
      || action.toLowerCase().includes(needle),
    );
  }, [actions, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const pick = (action: string) => {
    onChange(action);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="search"
        autoComplete="off"
        value={open ? query : (value ? activityActionLabel(value) : '')}
        placeholder="Действие"
        onFocus={() => setOpen(true)}
        onChange={event => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
      />
      {open && (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => pick('')}
            className={`flex w-full px-3 py-2 text-left text-sm ${!value ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Все действия
          </button>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Нет данных</div>
          ) : filtered.map(action => (
            <button
              key={action}
              type="button"
              onClick={() => pick(action)}
              className={`flex w-full px-3 py-2 text-left text-sm ${
                action === value ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {activityActionLabel(action)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

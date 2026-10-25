
import React, { useEffect, useMemo, useRef, useState } from 'react';

export type SearchablePerson = {
  id: string;
  name: string;
  role?: string;
  phone?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Владелец',
  operator: 'Оператор',
  master: 'Мастер',
};

interface Props {
  people: SearchablePerson[];
  value: string;
  onChange: (id: string) => void;
}

export default function UserSearchSelect({ people, value, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = people.find(person => person.id === value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(person => {
      const role = ROLE_LABEL[person.role || ''] || person.role || '';
      return [person.name, person.phone || '', role].join(' ').toLowerCase().includes(needle);
    });
  }, [people, query]);

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

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="search"
        autoComplete="off"
        value={open ? query : (selected?.name || '')}
        placeholder="Сотрудник"
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
            Все
          </button>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Нет данных</div>
          ) : filtered.map(person => (
            <button
              key={person.id}
              type="button"
              onClick={() => pick(person.id)}
              className={`flex w-full flex-col px-3 py-2 text-left ${
                person.id === value ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium text-gray-900">{person.name}</span>
              <span className="text-xs text-gray-500">
                {[ROLE_LABEL[person.role || ''] || person.role, person.phone].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

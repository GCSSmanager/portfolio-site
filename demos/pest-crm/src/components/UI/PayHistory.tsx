
import React, { useState } from 'react';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import type { PayEntry } from '@/types';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';

interface Props {
  amount: string;
  onAmountChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  payments: PayEntry[];
  saving?: boolean;
  formatMoney: (n: number) => string;
}

const formatPayDate = (iso: string): string =>
  new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function PayHistory({
  amount,
  onAmountChange,
  onAdd,
  onDelete,
  payments,
  saving,
  formatMoney,
}: Props) {
  const [showValidation, setShowValidation] = useState(false);
  const parsed = Number(amount.replace(/\s/g, '').replace(',', '.'));
  const canAdd = Number.isFinite(parsed) && parsed > 0;

  const handleAdd = () => {
    setShowValidation(true);
    if (!canAdd) return;
    onAdd();
    setShowValidation(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <Input
            label="Сумма выплаты"
            type="number"
            min={0}
            step={100}
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0"
            disabled={saving}
            error={showValidation && !canAdd ? REQUIRED_FIELD_ERROR : undefined}
          />
        </div>
        <Button
          type="button"
          variant="success"
          onClick={handleAdd}
          loading={saving}
          disabled={saving}
          className={submitButtonClass(canAdd)}
        >
          Добавить
        </Button>
      </div>

      {payments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Выплат пока нет</p>
      ) : (
        <ul className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-48 overflow-y-auto bg-white">
          {payments.map((payment) => (
            <li key={payment.id} className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{formatPayDate(payment.createdAt)}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-900">{formatMoney(payment.amount)}</span>
                <button
                  type="button"
                  onClick={() => onDelete(payment.id)}
                  className="text-gray-400 hover:text-red-600 text-sm leading-none"
                  title="Удалить"
                  disabled={saving}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

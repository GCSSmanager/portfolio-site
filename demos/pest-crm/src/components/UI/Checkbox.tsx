import type { ReactNode } from 'react';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
};

export default function Checkbox({ checked, onChange, label, className = '' }: Props) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 text-sm text-gray-600 ${className}`}>
      <input
        type="checkbox"
        className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

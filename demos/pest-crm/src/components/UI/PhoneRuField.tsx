import React from 'react';
import { PhoneRuInput } from '@/components/demo/PhoneRuInput';
import { phoneRuValidityMessage } from '@/lib/phone-ru';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
};

export default function PhoneRuField({
  label,
  value,
  onChange,
  error,
  hint,
  className = '',
  id,
  disabled,
  onFocus,
  onBlur,
}: Props) {
  const showInvalid = Boolean(error && error !== ' ');

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {label ? (
        <label
          htmlFor={id}
          className={`block text-sm font-medium ${showInvalid ? 'text-red-600' : 'text-gray-700'}`}
        >
          {label}
        </label>
      ) : null}
      <PhoneRuInput
        id={id}
        value={value}
        onChange={onChange}
        error={showInvalid}
        disabled={disabled}
        className="py-3 text-base sm:py-2.5 sm:text-sm"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {showInvalid ? (
        <p className="text-sm text-red-600">{error === ' ' ? phoneRuValidityMessage() : error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

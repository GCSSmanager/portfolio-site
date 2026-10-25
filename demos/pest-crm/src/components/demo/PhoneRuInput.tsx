import type { InputHTMLAttributes } from 'react';
import {
  applyPhoneRuInput,
  phoneRuOnBlur,
  phoneRuOnFocus,
  PHONE_PREFIX,
} from '@/lib/phone-ru';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
};

export function PhoneRuInput({ value, onChange, className = '', error, onFocus, onBlur, ...props }: Props) {
  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      maxLength={18}
      placeholder="+7 (___) ___-__-__"
      className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
        error ? 'border-red-300' : 'border-gray-200'
      } ${className}`.trim()}
      value={value}
      onFocus={event => {
        onChange(phoneRuOnFocus(value));
        onFocus?.(event);
      }}
      onBlur={event => {
        onChange(phoneRuOnBlur(value));
        onBlur?.(event);
      }}
      onChange={event => onChange(applyPhoneRuInput(value, event.target.value))}
      onKeyDown={event => {
        const input = event.currentTarget;
        const { selectionStart, selectionEnd } = input;
        if (selectionStart == null || selectionEnd == null) return;
        if (selectionStart !== selectionEnd) return;

        if (event.key === 'Backspace' && selectionStart <= PHONE_PREFIX.length) {
          event.preventDefault();
          onChange(PHONE_PREFIX);
        }
      }}
    />
  );
}

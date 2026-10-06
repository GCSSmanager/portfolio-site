import type { InputHTMLAttributes } from "react";
import {
  applyPhoneRuInput,
  phoneRuOnBlur,
  phoneRuOnFocus,
  PHONE_PREFIX,
} from "../lib/phone-ru";
import { Input } from "./ui";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
};

/** Поле телефона РФ с маской +7 (___) ___-__-__. */
export function PhoneRuInput({ value, onChange, className = "", ...props }: Props) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      maxLength={18}
      data-phone-ru
      placeholder="+7 (___) ___-__-__"
      className={className}
      value={value}
      onFocus={() => onChange(phoneRuOnFocus(value))}
      onBlur={() => onChange(phoneRuOnBlur(value))}
      onChange={(event) => onChange(applyPhoneRuInput(value, event.target.value))}
      onKeyDown={(event) => {
        const input = event.currentTarget;
        const { selectionStart, selectionEnd } = input;
        if (selectionStart == null || selectionEnd == null) return;
        if (selectionStart !== selectionEnd) return;

        if (event.key === "Backspace" && selectionStart <= PHONE_PREFIX.length) {
          event.preventDefault();
          onChange(PHONE_PREFIX);
          return;
        }

        if (event.key === "Delete" && selectionStart < PHONE_PREFIX.length) {
          event.preventDefault();
        }
      }}
    />
  );
}

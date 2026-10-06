import { Field, SearchSelect } from "./ui";
import type { SearchOption } from "./ui";

interface Props {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function RoomPickerField({
  value,
  options,
  onChange,
  label = "Кабинет",
  placeholder = "Кабинет…",
}: Props) {
  return (
    <Field label={label}>
      <SearchSelect value={value} onChange={onChange} options={options} placeholder={placeholder} />
    </Field>
  );
}

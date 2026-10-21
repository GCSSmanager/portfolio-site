type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Подпись справа от переключателя (опционально). */
  label?: string
  ariaLabel?: string
}

/** Кастомный чекбокс в стиле CRM (квадрат с галочкой). */
export function CrmToggleField({ checked, onChange, disabled = false, label, ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel ?? label ?? (checked ? 'Включено' : 'Выключено')}
      disabled={disabled}
      className={`crm-toggle${checked ? ' crm-toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="crm-toggle__box" aria-hidden />
      {label ? <span className="crm-toggle__lab">{label}</span> : null}
    </button>
  )
}

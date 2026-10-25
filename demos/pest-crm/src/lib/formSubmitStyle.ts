/** Визуально «неактивная» зелёная кнопка — кликабельна, чтобы показать ошибки полей. */
export const SUBMIT_DISABLED_CLASS =
  '!bg-gray-300 !from-gray-300 !to-gray-300 !shadow-none hover:!from-gray-300 hover:!to-gray-300 text-gray-600';

export function submitButtonClass(canSubmit: boolean, extra = ''): string {
  const base = canSubmit ? '' : SUBMIT_DISABLED_CLASS;
  return [base, extra].filter(Boolean).join(' ');
}

export const REQUIRED_FIELD_ERROR = 'Обязательное поле';

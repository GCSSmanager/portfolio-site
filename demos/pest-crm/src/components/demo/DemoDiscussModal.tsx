import { useEffect, useState, type FormEvent } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import { PhoneRuInput } from '@/components/demo/PhoneRuInput';
import { sendCrmLeadReady } from '@/lib/crm-leads';
import { isPhoneRuComplete, phoneRuValidityMessage } from '@/lib/phone-ru';
import { submitButtonClass } from '@/lib/formSubmitStyle';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DemoDiscussModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const phoneReady = isPhoneRuComplete(phone);
  const canSubmit = phoneReady && !loading;

  useEffect(() => {
    if (!open) return;
    setName('');
    setPhone('');
    setError('');
    setLoading(false);
    setDone(false);
    setSubmitAttempted(false);
  }, [open]);

  const close = () => onOpenChange(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setError('');

    if (!phoneReady) {
      setError(phoneRuValidityMessage());
      return;
    }

    setLoading(true);
    try {
      await sendCrmLeadReady({
        name: name.trim() || 'Заявка с демо',
        phone,
        source: 'demo-discuss-pest',
        message: 'Обсудить внедрение CRM дезинсекция (−10% с демо)',
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={close} title="Обсудить внедрение" size="sm">
      {done ? (
        <p className="py-2 text-sm leading-relaxed text-gray-600">
          Спасибо! Мы свяжемся с вами в течение часа. Скидку −10% зафиксируем в заявке.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
            <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">−10%</span>
            <p className="text-sm text-gray-700">Скидка при заказе с демо — зафиксируем в заявке</p>
          </div>

          <Input label="Имя" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Телефон *</label>
            <PhoneRuInput
              value={phone}
              onChange={value => {
                setPhone(value);
                if (error) setError('');
              }}
              error={submitAttempted && !phoneReady}
            />
            {submitAttempted && !phoneReady ? (
              <p className="text-sm text-red-600">{phoneRuValidityMessage()}</p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="success"
            className={submitButtonClass(phoneReady, 'w-full')}
            disabled={loading}
            loading={loading}
          >
            Отправить
          </Button>
        </form>
      )}
    </Modal>
  );
}

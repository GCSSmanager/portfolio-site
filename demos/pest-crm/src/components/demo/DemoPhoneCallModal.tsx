import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import { formatPhoneRu } from '@/lib/phone';

type Props = {
  open: boolean;
  onClose: () => void;
  phone: string;
};

/** В портфолио-демо звонки не уходят в телефонию — только пояснение. */
export function DemoPhoneCallModal({ open, onClose, phone }: Props) {
  const display = formatPhoneRu(phone) || phone;

  return (
    <Modal isOpen={open} onClose={onClose} title="Демо: звонок" size="sm">
      <div className="space-y-4 py-1 text-center sm:text-left">
        <p className="text-lg font-semibold text-gray-900">{display}</p>
        <p className="text-sm leading-relaxed text-gray-600">
          Это демо на сайте — звонок не выполняется.
          В CRM оператор нажимает «Позвонить», отвечает на входящий на свой номер,
          после этого система соединяет с клиентом.
        </p>
        <p className="text-sm text-gray-500">
          В продукте клиент с этим номером получит обратный звонок от службы.
        </p>
        <Button type="button" className="w-full" onClick={onClose}>
          Понятно
        </Button>
      </div>
    </Modal>
  );
}

import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** В портфолио-демо записи разговоров не отдаются — только пояснение. */
export function DemoCallRecordingModal({ open, onClose }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Демо: запись звонка" size="sm">
      <div className="space-y-4 py-1 text-center sm:text-left">
        <p className="text-sm leading-relaxed text-gray-600">
          В CRM записи отвеченных разговоров приходят из АТС (Novofon). Файл хранится у оператора связи,
          в карточке заявки и по номеру клиента доступна кнопка «Слушать» — защищённая ссылка на аудио.
        </p>
        <p className="text-sm text-gray-500">
          В демо показан пример журнала. Реальных записей нет — прослушивание отключено.
        </p>
        <Button type="button" className="w-full" onClick={onClose}>
          Понятно
        </Button>
      </div>
    </Modal>
  );
}

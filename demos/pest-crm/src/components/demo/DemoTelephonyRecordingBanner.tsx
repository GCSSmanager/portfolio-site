import { isDemoMode } from '@/lib/isDemoMode';

export default function DemoTelephonyRecordingBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <span className="font-medium">Демо.</span>{' '}
      Журнал звонков — пример. В продукте здесь проигрываются записи с АТС; в демо аудио недоступно.
    </div>
  );
}


import React, { useState } from 'react';
import { DemoPhoneCallModal } from '@/components/demo/DemoPhoneCallModal';
import { isDemoMode } from '@/lib/isDemoMode';
import { formatPhoneRu } from '@/lib/phone';

interface ClickToCallPhoneProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
  stopPropagation?: boolean;
  buttonLabel?: string;
}

export default function ClickToCallPhone({
  phone,
  className = '',
  showIcon = true,
  stopPropagation = true,
  buttonLabel,
}: ClickToCallPhoneProps) {
  const [open, setOpen] = useState(false);
  const display = formatPhoneRu(phone) || phone;

  if (!phone?.trim()) {
    return <span className={className}>—</span>;
  }

  const openDemo = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    setOpen(true);
  };

  if (isDemoMode) {
    return (
      <>
        {buttonLabel ? (
          <button type="button" onClick={openDemo} className={className}>
            {buttonLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={openDemo}
            className={`inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ${className}`}
          >
            {showIcon ? <span aria-hidden>📞</span> : null}
            <span>{display}</span>
          </button>
        )}
        <DemoPhoneCallModal open={open} onClose={() => setOpen(false)} phone={phone} />
      </>
    );
  }

  // Production build path (not used on portfolio).
  return (
    <a href={`tel:${phone.replace(/\D/g, '')}`} className={`text-blue-600 hover:text-blue-700 ${className}`}>
      {showIcon ? `📞 ${display}` : display}
    </a>
  );
}

export function ClickToCallPhoneList({
  phones,
  className = '',
  itemClassName = '',
}: {
  phones: string | string[] | null | undefined;
  className?: string;
  itemClassName?: string;
}) {
  const list = Array.isArray(phones)
    ? phones.filter(Boolean)
    : (phones || '')
        .split(/[,;]+/)
        .map(p => p.trim())
        .filter(Boolean);

  if (!list.length) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {list.map((p, i) => (
        <ClickToCallPhone key={`${p}-${i}`} phone={p} className={itemClassName} />
      ))}
    </span>
  );
}

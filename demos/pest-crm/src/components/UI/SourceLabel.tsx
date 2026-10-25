
import React, { useState } from 'react';
import { getSourceLabelInfo } from '@/lib/sourceLabel';

type Props = {
  source: string | null | undefined;
  className?: string;
  /** светлый текст на цветном фоне (шапка заказа) */
  light?: boolean;
  /** выравнивание блока (в статистике — влево, в карточке заказа — вправо) */
  align?: 'start' | 'end';
};

export default function SourceLabel({ source, className = '', light = false, align = 'end' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const info = getSourceLabelInfo(source);

  if (!source || info.short === '—') {
    return <span className={className}>—</span>;
  }

  if (!info.isLong) {
    return <span className={className}>{info.short}</span>;
  }

  const btnClass = light
    ? 'underline decoration-white/40 underline-offset-2 hover:decoration-white'
    : 'text-teal-700 hover:text-teal-900 underline decoration-teal-300/60 underline-offset-2';

  const alignClass = align === 'start' ? 'items-start text-left' : 'items-end text-right';

  return (
    <span className={`inline-flex flex-col gap-1 max-w-full ${alignClass} ${className}`}>
      <button
        type="button"
        className={`${btnClass} font-medium break-words text-inherit`}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        title={expanded ? 'Скрыть полный источник' : 'Показать полный источник'}
      >
        {info.short}
      </button>
      {expanded && (
        <span
          className={`text-[11px] leading-snug break-all max-w-[min(100%,28rem)] ${
            light ? 'text-white/85' : 'text-gray-500'
          }`}
        >
          {info.full}
        </span>
      )}
    </span>
  );
}

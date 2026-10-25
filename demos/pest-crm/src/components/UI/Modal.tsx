import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Верхняя модалка закрывается по Escape */
const escapeCloseStack: Array<() => void> = [];
let escapeListenerAttached = false;

const isEscapeKey = (e: KeyboardEvent): boolean =>
  e.key === 'Escape' || e.code === 'Escape' || e.key === 'Esc';

const onGlobalEscape = (e: KeyboardEvent): void => {
  if (!isEscapeKey(e)) return;
  const closeTop = escapeCloseStack[escapeCloseStack.length - 1];
  if (!closeTop) return;
  e.preventDefault();
  closeTop();
};

const pushEscapeCloser = (close: () => void): void => {
  escapeCloseStack.push(close);
  if (!escapeListenerAttached) {
    window.addEventListener('keydown', onGlobalEscape);
    escapeListenerAttached = true;
  }
};

const popEscapeCloser = (close: () => void): void => {
  const idx = escapeCloseStack.lastIndexOf(close);
  if (idx >= 0) escapeCloseStack.splice(idx, 1);
  if (escapeCloseStack.length === 0 && escapeListenerAttached) {
    window.removeEventListener('keydown', onGlobalEscape);
    escapeListenerAttached = false;
  }
};

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
} as const;

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const onCloseRef = useRef(onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => {
      onCloseRef.current();
    };
    pushEscapeCloser(close);

    requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
    });

    return () => {
      popEscapeCloser(close);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Закрыть"
      className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:bg-gray-100"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  const closeIfBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="pest-modal-backdrop fixed inset-0 z-[100] animate-fade-in bg-gray-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={closeIfBackdrop}
    >
      <div
        className="pest-modal-backdrop__center flex min-h-full w-full items-center justify-center"
        onMouseDown={closeIfBackdrop}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`pest-modal-panel relative flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none animate-scale-in ${sizeClass[size]}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {closeButton}
          </div>
          <div className="pest-modal-panel__body min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 scrollbar-thin sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

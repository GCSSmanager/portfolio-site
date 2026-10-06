import { useEffect } from "react";

let lockCount = 0;

/**
 * Блокируем только overflow — без position:fixed на body.
 * position:fixed на iOS ломает клики по кнопкам в порталах/модалках.
 */
export function lockBodyScroll() {
  if (lockCount === 0) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount !== 0) return;

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

const HOVER_DELAY_MS = 1500;
const PREVIEW_WIDTH = 280;
const PREVIEW_EST_HEIGHT = 240;
const MARGIN = 8;

export function clampPreviewPosition(
  rect: DOMRect,
  size: { width: number; height: number } = { width: PREVIEW_WIDTH, height: PREVIEW_EST_HEIGHT },
) {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = Math.min(size.width, viewportW - MARGIN * 2);
  const height = Math.min(size.height, viewportH - MARGIN * 2);

  let left = rect.right + MARGIN;
  if (left + width > viewportW - MARGIN) {
    left = rect.left - width - MARGIN;
  }
  if (left < MARGIN) {
    left = Math.min(viewportW - width - MARGIN, Math.max(MARGIN, rect.left));
  }
  left = Math.max(MARGIN, Math.min(left, viewportW - width - MARGIN));

  let top = rect.top;
  if (top + height > viewportH - MARGIN) {
    // Сначала пробуем прижать к низу экрана, затем — над блоком.
    top = viewportH - height - MARGIN;
    if (top < MARGIN && rect.top > height + MARGIN) {
      top = rect.top - height - MARGIN;
    }
  }
  top = Math.max(MARGIN, Math.min(top, viewportH - height - MARGIN));

  return { top, left };
}

export function useAppointmentPreview(disabled = false) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const setAnchorRef = useCallback((node: HTMLElement | null) => {
    anchorRef.current = node;
  }, []);
  const hoverTimerRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current != null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHoverTimer();
    setVisible(false);
  }, [clearHoverTimer]);

  const reposition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const preview = previewRef.current;
    const size = preview
      ? { width: preview.offsetWidth || PREVIEW_WIDTH, height: preview.offsetHeight || PREVIEW_EST_HEIGHT }
      : { width: PREVIEW_WIDTH, height: PREVIEW_EST_HEIGHT };
    setPosition(clampPreviewPosition(rect, size));
  }, []);

  const show = useCallback(() => {
    if (disabled || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition(clampPreviewPosition(rect));
    setVisible(true);
  }, [disabled]);

  const setPreviewRef = useCallback(
    (node: HTMLElement | null) => {
      previewRef.current = node;
      if (node && visible) {
        // После монтирования учитываем реальную высоту (группы, длинные заметки).
        requestAnimationFrame(() => reposition());
      }
    },
    [reposition, visible],
  );

  const onMouseEnter = useCallback(() => {
    if (disabled) return;
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(show, HOVER_DELAY_MS);
  }, [clearHoverTimer, disabled, show]);

  const onMouseLeave = useCallback(() => {
    hide();
  }, [hide]);

  const onContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      clearHoverTimer();
      show();
    },
    [clearHoverTimer, disabled, show],
  );

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => hide();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [hide, visible]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  return {
    setAnchorRef,
    setPreviewRef,
    visible,
    position,
    previewHandlers: { onMouseEnter, onMouseLeave, onContextMenu },
    hidePreview: hide,
  };
}

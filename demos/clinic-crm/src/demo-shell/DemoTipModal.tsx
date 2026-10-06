import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Checkbox } from "../components/ui";
import { useBodyScrollLock } from "../components/ui/scroll-lock";
import { DemoMediaFrame } from "./DemoMediaFrame";
import { DemoSlideCarousel, DemoSlideNav } from "./DemoSlideCarousel";
import type { DemoTipContent } from "./types";

interface Props {
  open: boolean;
  tipId: string;
  content: DemoTipContent;
  /** Галочка «не показывать подсказки» — только у подсказок страниц, не у welcome. */
  showMute?: boolean;
  muteChecked: boolean;
  onMuteChange: (muted: boolean) => void;
  onClose: () => void;
}

/** Оверлей стабильный между подсказками; диалог меняется по tipId без мигания фона. */
export function DemoTipModal({
  open,
  tipId,
  content,
  showMute = true,
  muteChecked,
  onMuteChange,
  onClose,
}: Props) {
  useBodyScrollLock(open);
  const [draftMute, setDraftMute] = useState(muteChecked);
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = content.slides ?? [];
  const slideCount = slides.length;
  const hasSlides = slideCount > 0;

  useEffect(() => {
    if (open) {
      setDraftMute(muteChecked);
      setSlideIndex(0);
    }
  }, [open, muteChecked, tipId, content]);

  useEffect(() => {
    if (!open) return;

    const dismiss = () => {
      if (showMute) onMuteChange(draftMute);
      onClose();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (slideCount <= 1) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSlideIndex((value) => (value - 1 + slideCount) % slideCount);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setSlideIndex((value) => (value + 1) % slideCount);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, draftMute, showMute, onMuteChange, onClose, slideCount]);

  if (!open) return null;

  const dismiss = () => {
    if (showMute) onMuteChange(draftMute);
    onClose();
  };

  const prev = () => setSlideIndex((value) => (value - 1 + slideCount) % slideCount);
  const next = () => setSlideIndex((value) => (value + 1) % slideCount);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-none p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-ink/80 backdrop-blur-xl [transform:translateZ(0)]"
        aria-label="Закрыть"
        onClick={dismiss}
      />
      <div
        key={tipId}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-tip-title"
        className={`relative z-10 my-auto flex flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-card sm:rounded-2xl ${
          hasSlides
            ? "w-[min(80rem,calc(100vw-1rem))]"
            : "w-full max-w-3xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`shrink-0 ${hasSlides ? "px-4 pt-3 sm:px-5 sm:pt-4" : "px-6 pt-5 sm:px-8 sm:pt-7"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Демо CRM</p>
          <h1
            id="demo-tip-title"
            className={`font-semibold tracking-tight text-ink ${
              hasSlides ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
            }`}
          >
            {content.title}
          </h1>
        </div>

        <div className={`min-w-0 ${hasSlides ? "px-4 py-2.5 sm:px-5" : "px-6 py-4 sm:px-8 sm:py-5"}`}>
          {hasSlides ? (
            <DemoSlideCarousel slides={slides} index={slideIndex} />
          ) : (
            <div className="space-y-4">
              {(content.body ?? "")
                .split(/\n\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-relaxed text-ink-muted sm:text-base">
                    {paragraph}
                  </p>
                ))}
              <DemoMediaFrame media={content.media} />
            </div>
          )}
        </div>

        <div
          className={`flex shrink-0 flex-col gap-3 border-t border-line sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
            hasSlides ? "px-4 py-3 sm:px-5 sm:py-3.5" : "px-6 py-4 sm:px-8 sm:py-5"
          } ${showMute ? "" : "sm:justify-end"}`}
        >
          {showMute ? (
            <Checkbox
              checked={draftMute}
              onChange={setDraftMute}
              label="Не показывать больше никаких подсказок"
              className="min-w-0 max-w-full sm:max-w-[18rem]"
            />
          ) : null}
          <div className="flex shrink-0 items-center justify-end gap-3">
            <DemoSlideNav index={slideIndex} total={slideCount} onPrev={prev} onNext={next} />
            <Button className="min-w-[8rem]" onClick={dismiss}>
              {content.ctaLabel ?? "Понятно"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

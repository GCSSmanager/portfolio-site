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

/** Подсказка: ширина ~70% экрана, потолок 56rem; без внутреннего скролла. */
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2">
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
        className={`relative z-10 overflow-hidden rounded-xl border border-line bg-panel shadow-card sm:rounded-2xl ${
          hasSlides ? "w-[min(94vw,64rem)]" : "w-[min(94vw,40rem)]"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Демо CRM</p>
          <h1 id="demo-tip-title" className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {content.title}
          </h1>
        </div>

        <div className="px-4 py-2.5 sm:px-6 sm:py-3">
          {hasSlides ? (
            <DemoSlideCarousel slides={slides} index={slideIndex} />
          ) : (
            <div className="space-y-3">
              {(content.body ?? "")
                .split(/\n\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-ink-muted sm:text-[15px]">
                    {paragraph}
                  </p>
                ))}
              <DemoMediaFrame media={content.media} />
            </div>
          )}
        </div>

        <div
          className={`flex flex-col gap-2.5 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5 ${
            showMute ? "" : "sm:justify-end"
          }`}
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

import { type ReactNode } from "react";
import type { DemoMediaSlot, DemoTipSlide } from "./types";
import { DemoMediaFrame } from "./DemoMediaFrame";

interface Props {
  slides: DemoTipSlide[];
  index: number;
}

/** Текущий слайд: жирный заголовок + превью. */
export function DemoSlideCarousel({ slides, index }: Props) {
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-bold tracking-tight text-ink sm:text-lg">{slide.headline}</h2>
      <DemoMediaFrame media={slide.media ?? placeholderMedia()} />
    </div>
  );
}

function placeholderMedia(): DemoMediaSlot {
  return { kind: "placeholder", caption: "Здесь будет gif со сценарием" };
}

export function DemoSlideNav({
  index,
  total,
  onPrev,
  onNext,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <NavButton label="Предыдущий слайд" onClick={onPrev}>
        <Chevron dir="left" />
      </NavButton>
      <div className="min-w-[2.75rem] text-center text-sm font-semibold tabular-nums text-ink-muted">
        {index + 1}/{total}
      </div>
      <NavButton label="Следующий слайд" onClick={onNext}>
        <Chevron dir="right" />
      </NavButton>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink transition-colors hover:bg-brand-light"
    >
      {children}
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  const isLeft = dir === "left";
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d={isLeft ? "M10.5 3.5 5.5 8l5 4.5" : "M5.5 3.5 10.5 8l-5 4.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

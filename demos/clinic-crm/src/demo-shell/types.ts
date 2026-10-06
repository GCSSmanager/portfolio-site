import type { ReactNode } from "react";

/** Слот медиа: gif/картинка/видео/заглушка. */
export type DemoMediaSlot =
  | { kind: "none" }
  | { kind: "placeholder"; caption?: string }
  | { kind: "gif"; src: string; alt?: string; caption?: string }
  | { kind: "image"; src: string; alt?: string; caption?: string }
  | { kind: "video"; src: string; poster?: string; caption?: string }
  | { kind: "iframe"; src: string; title?: string; caption?: string };

/** Один слайд подсказки: выгода сверху + медиа (часто gif). */
export interface DemoTipSlide {
  /** Рекламный акцент: что бизнесу даёт этот сценарий. */
  headline: string;
  /** Коротко про эффект / метрику / боль. */
  pitch?: string;
  media?: DemoMediaSlot;
}

export interface DemoTipContent {
  /** Служебный/навигационный заголовок модалки (раздел). */
  title: string;
  /** Если нет slides — простой текст (welcome и текстовые подсказки). */
  body?: string;
  ctaLabel?: string;
  media?: DemoMediaSlot;
  /** Карусель выгод + gif/видео. */
  slides?: DemoTipSlide[];
}

export interface DemoShellConfig {
  id: string;
  muteKey: string;
  seenPrefix: string;
  welcome: DemoTipContent;
  pages: Record<string, DemoTipContent>;
}

export interface DemoShellContextValue {
  config: DemoShellConfig;
  tipOpen: boolean;
  tipsMuted: boolean;
  /** Есть ли подсказка для текущей страницы (не welcome). */
  hasPageTip: boolean;
  setTipsMuted: (muted: boolean) => void;
  openCurrentTip: () => void;
  closeTip: () => void;
}

export type DemoShellChildren = ReactNode;

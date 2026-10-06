import type { DemoMediaSlot } from "./types";

function mediaUrl(src: string) {
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${src.replace(/^\//, "")}`;
}

/** Фиксированный кадр под gif — без скачка размера, пока картинка грузится. */
export function DemoMediaFrame({ media }: { media?: DemoMediaSlot }) {
  if (!media || media.kind === "none") return null;

  const stageClass =
    "relative aspect-[16/9] w-full overflow-hidden rounded-md border border-line bg-ink/[0.04]";
  const mediaClass = "absolute inset-0 h-full w-full object-contain";

  if (media.kind === "gif" || media.kind === "image") {
    return (
      <figure className="m-0 w-full">
        <div className={stageClass}>
          <img
            src={mediaUrl(media.src)}
            alt={media.alt ?? ""}
            className={mediaClass}
            decoding="async"
          />
        </div>
        {media.caption ? (
          <figcaption className="mt-2 text-center text-xs text-ink-muted">{media.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (media.kind === "video") {
    return (
      <figure className="m-0 w-full">
        <div className={stageClass}>
          <video
            className={mediaClass}
            src={mediaUrl(media.src)}
            poster={media.poster ? mediaUrl(media.poster) : undefined}
            controls
            playsInline
            preload="metadata"
          />
        </div>
        {media.caption ? (
          <figcaption className="mt-2 text-center text-xs text-ink-muted">{media.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (media.kind === "iframe") {
    return (
      <figure className="m-0 w-full">
        <div className={stageClass}>
          <iframe
            className="h-full w-full"
            src={media.src}
            title={media.title ?? "Видео"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {media.caption ? (
          <figcaption className="mt-2 text-center text-xs text-ink-muted">{media.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="m-0 w-full">
      <div className={`${stageClass} flex items-center justify-center border-dashed bg-surface px-6 text-center`}>
        <div className="max-w-xs space-y-1">
          <div className="text-sm font-medium text-ink">Gif скоро</div>
          <p className="text-xs leading-relaxed text-ink-muted">
            {media.caption ?? "Здесь появится короткая анимация сценария."}
          </p>
        </div>
      </div>
    </figure>
  );
}

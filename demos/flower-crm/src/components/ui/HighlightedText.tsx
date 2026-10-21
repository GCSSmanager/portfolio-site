import { segmentsWithHits } from '../../utils/taxonSearchQuery'

type Props = {
  text: string
  highlightWords: string[]
  className?: string
}

/** Подсветка совпадений поиска в тексте (каталог, цены и т.д.). */
export function HighlightedText({ text, highlightWords, className }: Props) {
  if (!highlightWords.length) return className ? <span className={className}>{text}</span> : text
  const segs = segmentsWithHits(text, highlightWords)
  const inner = (
    <>
      {segs.map((s, i) =>
        s.hit ? (
          <mark key={i} className="flowers-search-hit">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
  return className ? <span className={className}>{inner}</span> : inner
}

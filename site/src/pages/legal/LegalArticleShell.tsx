import type { ReactNode } from 'react'

export type LegalTocItem = {
  id: string
  n: string
  label: string
}

type LegalArticleShellProps = {
  toc: LegalTocItem[]
  children: ReactNode
}

export function LegalArticleShell({ toc, children }: LegalArticleShellProps) {
  return (
    <article className="legal">
      <div className="legal__inner">
        <aside className="legal__aside">
          <p className="legal__kicker">Документы</p>
          <nav aria-label="Содержание">
            <ol className="legal__toc">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>
                    <span>{item.n}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <div className="legal__body">{children}</div>
      </div>
    </article>
  )
}

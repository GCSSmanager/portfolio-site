import type { ProblemIcon as ProblemIconName } from './landingContent'

export function ProblemIcon({ name }: { name: ProblemIconName }) {
  return (
    <img
      src={`/landing/icons/${name}.svg`}
      alt=""
      aria-hidden
      width={28}
      height={28}
      loading="lazy"
      decoding="async"
    />
  )
}

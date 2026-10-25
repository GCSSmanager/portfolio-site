export type WireBox = {
  l: number
  r: number
  t: number
  b: number
  cx: number
  cy: number
}

export type WireLayoutEnv = {
  rootWidth: number
  mobile: boolean
  desktop: boolean
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function measureWireBox(el: Element, root: Element): WireBox {
  const a = el.getBoundingClientRect()
  const s = root.getBoundingClientRect()
  return {
    l: a.left - s.left,
    r: a.right - s.left,
    t: a.top - s.top,
    b: a.bottom - s.top,
    cx: (a.left + a.right) / 2 - s.left,
    cy: (a.top + a.bottom) / 2 - s.top,
  }
}

export function wireAcross(
  from: WireBox,
  fromSide: 'l' | 'r',
  to: WireBox,
  toSide: 'l' | 'r',
): string {
  const x1 = fromSide === 'r' ? from.r : from.l
  const x2 = toSide === 'l' ? to.l : to.r
  const overlapTop = Math.max(from.t, to.t)
  const overlapBot = Math.min(from.b, to.b)

  if (overlapBot - overlapTop >= 10) {
    const y = (overlapTop + overlapBot) / 2
    return `M${x1} ${y}L${x2} ${y}`
  }

  const y1 = clamp(from.cy, from.t + 6, from.b - 6)
  const y2 = clamp(y1, to.t + 6, to.b - 6)
  const yFrom = clamp(y2, from.t + 6, from.b - 6)

  if (Math.abs(yFrom - y2) < 1.5) {
    return `M${x1} ${yFrom}L${x2} ${y2}`
  }

  const xMid = (x1 + x2) / 2
  return `M${x1} ${yFrom}L${xMid} ${yFrom}L${xMid} ${y2}L${x2} ${y2}`
}

export function wireDownIntoTop(from: WireBox, to: WireBox): string {
  const railY = clamp(to.t - 12, from.b + 4, to.t - 2)
  const yStart = clamp(Math.min(from.b, railY - 2), from.t + 8, from.b - 4)
  return `M${from.cx} ${yStart}L${from.cx} ${railY}L${to.cx} ${railY}L${to.cx} ${to.t}`
}

export function wireSnakeDownIntoTop(from: WireBox, to: WireBox): string {
  const railY = clamp(to.t - 16, from.b + 2, to.t - 2)
  return `M${from.cx} ${from.b}L${from.cx} ${railY}L${to.cx} ${railY}L${to.cx} ${to.t}`
}

export function wireIntoTop(from: WireBox, to: WireBox, rootWidth: number): string {
  const drop = rootWidth < 768 ? 22 : 36
  const y = clamp(Math.min(from.cy, to.t - drop), from.t + 8, from.b - 8)
  const rail = y < to.t - 10 ? y : Math.min(from.b - 8, to.t - drop)
  return `M${from.l} ${rail}L${to.cx} ${rail}L${to.cx} ${to.t}`
}

export function wireOutBottom(from: WireBox, to: WireBox, rootWidth: number): string {
  const drop = rootWidth < 768 ? 22 : 36
  const y = clamp(Math.max(from.b + drop, to.t + 10), to.t + 10, to.b - 10)
  return `M${from.cx} ${from.b}L${from.cx} ${y}L${to.l} ${y}`
}

export function computeTelegramOffset(
  tgEl: HTMLElement,
  d2El: HTMLElement,
  d3El: HTMLElement,
  siteEl: HTMLElement,
  bankEl: HTMLElement,
): number {
  tgEl.style.translate = '0 0'
  const tb = tgEl.getBoundingClientRect()
  const a = d2El.getBoundingClientRect()
  const b = d3El.getBoundingClientRect()
  let dy = Math.round((a.bottom + b.top) / 2 - (tb.top + tb.bottom) / 2)
  const minDy = Math.ceil(siteEl.getBoundingClientRect().bottom + 8 - tb.top)
  const maxDy = Math.floor(bankEl.getBoundingClientRect().top - 8 - tb.bottom)
  if (minDy <= maxDy) dy = Math.max(minDy, Math.min(maxDy, dy))
  else dy = 0
  return dy
}

let locked = false
let scrollY = 0

export function refreshBodyScrollLock(): void {
  const openCount = document.querySelectorAll('dialog.crm-modal[open]').length
  if (openCount > 0 && !locked) {
    scrollY = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    const { style } = document.body
    style.overflow = 'hidden'
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.left = '0'
    style.right = '0'
    style.width = '100%'
    locked = true
    return
  }
  if (openCount === 0 && locked) {
    document.documentElement.style.overflow = ''
    const { style } = document.body
    style.overflow = ''
    style.position = ''
    style.top = ''
    style.left = ''
    style.right = ''
    style.width = ''
    window.scrollTo(0, scrollY)
    locked = false
  }
}

export function forceUnlockBodyScroll(): void {
  if (!locked) return
  document.documentElement.style.overflow = ''
  const { style } = document.body
  style.overflow = ''
  style.position = ''
  style.top = ''
  style.left = ''
  style.right = ''
  style.width = ''
  window.scrollTo(0, scrollY)
  locked = false
}

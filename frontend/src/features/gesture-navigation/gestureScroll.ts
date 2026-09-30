const scrollPageFraction = .65

export function scrollForSwipe(direction: 'up' | 'down', cursor: { x: number; y: number }): boolean {
  const root = document.scrollingElement ?? document.documentElement
  let element = document.elementFromPoint?.(cursor.x, cursor.y) ?? null
  const sign = direction === 'up' ? -1 : 1
  while (element && element !== root) {
    const style = getComputedStyle(element)
    const overflow = style.overflowY || style.overflow
    if (/^(auto|scroll)$/.test(overflow) && scroll(element, sign)) return true
    // A modal's boundary must not scroll the page behind it.
    if (element instanceof HTMLDialogElement && element.open) return false
    element = element.parentElement
  }
  return scroll(root, sign)
}

function scroll(element: Element, sign: number): boolean {
  const remaining = sign < 0 ? element.scrollTop : element.scrollHeight - element.clientHeight - element.scrollTop
  if (remaining <= 0 || !element.scrollBy) return false
  const height = element.clientHeight || window.innerHeight
  element.scrollBy({ top: sign * Math.min(remaining, height * scrollPageFraction), behavior: 'smooth' })
  return true
}

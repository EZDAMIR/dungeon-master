export function scrollForGesture(deltaY: number, cursor: { x: number; y: number }, scope: HTMLElement | null = null): boolean {
  if (!Number.isFinite(deltaY) || deltaY === 0) return false
  const root = document.scrollingElement ?? document.documentElement
  let element = document.elementFromPoint?.(cursor.x, cursor.y) ?? null
  if (scope && (!element || !scope.contains(element))) element = scope
  while (element && element !== root) {
    const style = getComputedStyle(element)
    const overflow = style.overflowY || style.overflow
    if (/^(auto|scroll)$/.test(overflow) && scroll(element, deltaY)) return true
    // A modal's boundary must not scroll the page behind it.
    if (element === scope || (element instanceof HTMLDialogElement && element.open) ||
      element.matches('[role="dialog"][aria-modal="true"]')) return false
    element = element.parentElement
  }
  return scope ? false : scroll(root, deltaY)
}

function scroll(element: Element, deltaY: number): boolean {
  const remaining = deltaY < 0 ? element.scrollTop : element.scrollHeight - element.clientHeight - element.scrollTop
  if (remaining <= 0 || !element.scrollBy) return false
  const height = element.clientHeight || window.innerHeight
  // Apply small deltas immediately; restarting smooth animations loses motion.
  element.scrollBy({ top: Math.sign(deltaY) * Math.min(remaining, height * Math.abs(deltaY)), behavior: 'instant' })
  return true
}

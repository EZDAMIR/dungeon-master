export class GestureTargetRegistry {
  private targets = new Map<string, { element: HTMLButtonElement | HTMLAnchorElement; rect: DOMRect; onSelect?:(source?: 'hands' | 'physical')=>void }>()
  private scope: HTMLElement | null = null
  setScope(scope: HTMLElement | null) { this.scope = scope }
  private allowed(element: HTMLElement) {
    const details = element.closest('details')
    return (!this.scope || this.scope.contains(element)) && !element.inert &&
      !element.closest('[inert], [hidden]') && (!details || details.open) && getComputedStyle(element).visibility !== 'hidden'
  }
  private disabled(element: HTMLButtonElement | HTMLAnchorElement) { return element instanceof HTMLButtonElement && element.disabled }
  register(id: string, element: HTMLButtonElement | HTMLAnchorElement, onSelect?:(source?: 'hands' | 'physical')=>void) {
    if (this.targets.has(id)) throw new Error(`Duplicate gesture target: ${id}`)
    this.targets.set(id,{element,rect:element.getBoundingClientRect(),onSelect})
    const observer = new ResizeObserver(() => this.refresh())
    observer.observe(element)
    return () => { observer.disconnect(); this.targets.delete(id) }
  }
  activate(id:string) {const target=this.targets.get(id);if(target?.element.isConnected && !this.disabled(target.element) && this.allowed(target.element))target.onSelect?.('hands')}
  refresh() { for (const target of this.targets.values()) target.rect = target.element.getBoundingClientRect() }
  resolve(x: number, y: number): string | null {
    // Current rects also cover scroll, fonts, animations and layout shifts without a DOM query.
    this.refresh()
    const hit = document.elementFromPoint?.(x, y)
    for (const [id, { element, rect }] of this.targets) {
      if (this.allowed(element) && !this.disabled(element) && element.isConnected &&
        (!hit || element === hit || element.contains(hit)) && rect.width > 0 && rect.height > 0 &&
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return id
    }
    return null
  }
  rect(id: string) { this.refresh(); return this.targets.get(id)?.rect ?? null }
}

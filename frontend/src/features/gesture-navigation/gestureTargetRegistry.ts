export class GestureTargetRegistry {
  private targets = new Map<string, { element: HTMLButtonElement; rect: DOMRect; onSelect?:(source?: 'hands' | 'physical')=>void }>()
  private scope: HTMLElement | null = null
  setScope(scope: HTMLElement | null) { this.scope = scope }
  private allowed(element: HTMLElement) { return !this.scope || this.scope.contains(element) }
  register(id: string, element: HTMLButtonElement, onSelect?:(source?: 'hands' | 'physical')=>void) {
    if (this.targets.has(id)) throw new Error(`Duplicate gesture target: ${id}`)
    this.targets.set(id,{element,rect:element.getBoundingClientRect(),onSelect})
    const observer = new ResizeObserver(() => this.refresh())
    observer.observe(element)
    return () => { observer.disconnect(); this.targets.delete(id) }
  }
  activate(id:string) {const target=this.targets.get(id);if(target?.element.isConnected && !target.element.disabled && this.allowed(target.element))target.onSelect?.('hands')}
  refresh() { for (const target of this.targets.values()) target.rect = target.element.getBoundingClientRect() }
  resolve(x: number, y: number): string | null {
    // Current rects also cover scroll, fonts, animations and layout shifts without a DOM query.
    this.refresh()
    for (const [id, { element, rect }] of this.targets) {
      if (this.allowed(element) && !element.disabled && element.isConnected && rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return id
    }
    return null
  }
  rect(id: string) { this.refresh(); return this.targets.get(id)?.rect ?? null }
}

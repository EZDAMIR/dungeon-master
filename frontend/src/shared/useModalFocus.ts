import { useEffect, useRef, type RefObject } from 'react';
export function useModalFocus(root: RefObject<HTMLElement | null>, onEscape: () => void) {
  const escape = useRef(onEscape);
  useEffect(() => { escape.current = onEscape; }, [onEscape]);
  useEffect(() => {
    const modal = root.current; if (!modal) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = modal.closest('[data-product-modal]') ?? modal;
    const background = [...document.body.children].filter(element => element !== host && !element.contains(modal)) as HTMLElement[];
    const states = background.map(element => ({ element, inert: element.inert }));
    for (const { element } of states) element.inert = true;
    const targets = () => [...modal.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(element => !element.hidden);
    targets()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); escape.current(); }
      if (event.key !== 'Tab') return;
      const items = targets(), active = document.activeElement;
      if (!items.length) { event.preventDefault(); modal.focus(); return; }
      if (event.shiftKey && (active === items[0] || !modal.contains(active))) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && (active === items[items.length - 1] || !modal.contains(active))) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); for (const { element, inert } of states) element.inert = inert; if (previous?.isConnected) previous.focus(); };
  }, [root]);
}

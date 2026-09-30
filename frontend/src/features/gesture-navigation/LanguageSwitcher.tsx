import { useEffect, useRef, useState } from 'react'
import { GestureTarget } from './GestureTarget'
import { useTranslation, type UiLanguage } from '../../shared/uiLanguage'

const languages: readonly { code: UiLanguage; name: string }[] = [
  { code: 'ru', name: 'Русский' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'en', name: 'English' },
]

export function LanguageSwitcher({ id = 'nav-language' }: { id?: string }) {
  const { language, setLanguage: setUiLanguage, translateUi } = useTranslation()
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setOpen(false)
        panel.current?.querySelector<HTMLButtonElement>(`[data-gesture-target="${id}"]`)?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape, true) }
  }, [open, id])
  return <div className="language-switcher" ref={panel}>
    <GestureTarget id={id} ariaLabel={translateUi('Выбрать язык сайта')} aria-expanded={open} aria-controls={`${id}-options`} onSelect={() => setOpen(value => !value)}>
      <span aria-hidden="true">◎</span> {language.toUpperCase()}
    </GestureTarget>
    {open && <div id={`${id}-options`} className="language-options" role="group" aria-label={translateUi('Язык сайта')}>
      {languages.map(item => <GestureTarget key={item.code} id={`${id}-${item.code}`} selected={item.code === language} lang={item.code} onSelect={() => { setUiLanguage(item.code); setOpen(false) }}>{item.name}</GestureTarget>)}
    </div>}
  </div>
}

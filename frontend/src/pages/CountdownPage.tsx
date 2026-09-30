import { useTranslation } from '../shared/uiLanguage'
export function CountdownPage({count}:{count:number}) {
  const { translateUi } = useTranslation()

 return <section className="countdown"><h2>{translateUi("Приготовься")}</h2><p className="rep-counter" role="status">{translateUi(count || 'START')}</p><p>{translateUi("Стой спокойно боком к камере. Дождись команды START.")}</p></section>
}

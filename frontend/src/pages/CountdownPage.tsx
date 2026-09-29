export function CountdownPage({count}:{count:number}) {
 return <section className="countdown"><h2>Приготовься</h2><p className="rep-counter" role="status">{count || 'START'}</p><p>Стой спокойно боком к камере. Дождись команды START.</p></section>
}

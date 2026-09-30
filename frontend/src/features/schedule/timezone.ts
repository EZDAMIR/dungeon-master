import { languageLocales, type UiLanguage } from '../../shared/uiLanguage'
function parts(at: number, timezone: string) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  return Object.fromEntries(values.map(part => [part.type, part.value]));
}
export function localDate(at: number, timezone: string) { const p = parts(at, timezone); return `${p.year}-${p.month}-${p.day}`; }
export function localToInstant(value: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Укажите дату и время');
  const naive = Date.parse(value + ':00Z');
  if (!Number.isFinite(naive)) throw new Error('Некорректное время');
  const offsets = new Set<number>();
  for (const shift of [-86400000, 0, 86400000]) {
    const sample = naive + shift, p = parts(sample, timezone);
    offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`) - sample);
  }
  const matches = [...offsets].map(offset => naive - offset).filter(candidate => {
    const p = parts(candidate, timezone); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value;
  });
  if (matches.length !== 1) throw new Error(matches.length ? 'Время неоднозначно из-за перехода часов. Выберите другой слот.' : 'Это время не существует в выбранном часовом поясе.');
  return new Date(matches[0]).toISOString();
}
export function formatAppointment(at: string, timezone: string, language: UiLanguage = 'ru') { return new Intl.DateTimeFormat(languageLocales[language], { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(at)); }

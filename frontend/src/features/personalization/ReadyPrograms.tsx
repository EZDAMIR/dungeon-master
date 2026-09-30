import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import type { PersonaKey } from '../../api/aiCoach';
import type { BackendStore } from '../../store/backend';
import { useTranslation } from '../../shared/uiLanguage';
import { GestureTarget } from '../gesture-navigation/GestureTarget';
import { demoPersonas } from './demoPersonas';

export function ReadyPrograms({ backend, onPlan, onPersonalize }: { backend: BackendStore; onPlan: () => void; onPersonalize: () => void }) {
  const { translateUi } = useTranslation();
  const [busy, setBusy] = useState<PersonaKey | null>(null), [stage, setStage] = useState<'persona' | 'program' | null>(null), [error, setError] = useState(''), [expanded, setExpanded] = useState(true);
  const loading = useRef(false), loaded = useRef<PersonaKey | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (loading.current) void backend.cancelGeneration().catch(() => {}); }; }, [backend]);
  async function choose(key: PersonaKey) {
    if (loading.current) return;
    loading.current = true; setBusy(key); setStage('persona'); setError('');
    let phase: 'persona' | 'program' = 'persona';
    try {
      if (loaded.current !== key) { await backend.loadPersona(key); loaded.current = key; }
      if (!mounted.current) return;
      phase = 'program'; setStage('program');
      await backend.generatePersonalized();
      if (!mounted.current) return;
      setExpanded(false); onPlan();
    } catch (error) {
      if (mounted.current) setError(error instanceof ApiError && error.status === 403
        ? phase === 'persona'
          ? 'Сервер запретил загрузку демо-тренеров. Проверьте настройки ENABLE_DEMO_PERSONAS и APP_ENV.'
          : 'Сервер запретил генерацию демо-программы. Проверьте настройку ENABLE_FIXTURE_MODE.'
        : 'Не удалось открыть программу. Проверь подключение и повтори выбор тренера.');
    } finally { loading.current = false; if (mounted.current) { setBusy(null); setStage(null); } }
  }
  return <section className="ready-programs" aria-labelledby="ready-programs-title">
    <h2 id="ready-programs-title">{translateUi('Готовые тренеры и программы')}</h2>
    {expanded ? <>
      <p>{translateUi('Выбери MAYA, ARMAN или DANA — откроем готовую программу без заполнения анкеты.')}</p>
      <p className="secondary">{translateUi('Выберите вымышленный context. Каждый профиль открывается в отдельной гостевой сессии.')}</p>
      {busy && <p role="status" aria-live="polite">{translateUi(stage === 'persona' ? 'Загружаем тренера' : 'Создаём программу')} · {busy.toUpperCase()}</p>}
      {error && <p role="alert">{translateUi(error)}</p>}
      <div className="persona-list">{demoPersonas.map(persona => <article className="persona-card" key={persona.key}>
        <h3>{persona.title}</h3><p className="dm-label">{translateUi(persona.subtitle)}</p>
        <p>{translateUi(persona.details)}</p><p>{translateUi(persona.story)}</p>
        <GestureTarget id={`ready-persona-${persona.key}`} className="dm-primary" disabled={busy !== null} onSelect={() => { void choose(persona.key); }}>{translateUi('Открыть программу')} · {persona.title}</GestureTarget>
      </article>)}</div>
    </> : <GestureTarget id="ready-program-change" onSelect={() => setExpanded(true)}>{translateUi('Выбрать другого тренера')}</GestureTarget>}
    <GestureTarget id="ready-program-personalize" disabled={busy !== null} onSelect={onPersonalize}>{translateUi('Подобрать план под меня')}</GestureTarget>
  </section>;
}

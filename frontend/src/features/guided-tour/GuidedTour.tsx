import { useEffect, useState, useSyncExternalStore } from 'react';
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import type { ReleaseClient } from '../../api/release';
import { GuideMachine, type GuideEvent } from './guideMachine';
export function GuidedTour({ audio, client, screen, event, planReady = false, enabled = true, onDone }: { audio: AudioCoordinator; client?: ReleaseClient; screen: string; event?: GuideEvent; planReady?: boolean; enabled?: boolean; onDone?: () => void }) {
  const [guide] = useState(() => new GuideMachine());
  const current = useSyncExternalStore(guide.subscribe, guide.getSnapshot);
  useEffect(() => {
    if (!enabled) return;
    if (screen === "PROFILE") guide.consume("context.opened");
    if (screen === "RESULTS") { guide.consume("results.opened"); }
    if (screen === "PROGRESS") guide.consume("progress.opened");
  }, [enabled, screen, guide]);
  useEffect(() => { if (planReady) guide.consume("plan.ready"); }, [guide, planReady]);
  useEffect(() => { if (event) { guide.consume(event); } }, [event, guide]);
  useEffect(() => {
    if (!enabled || !current) return;
    const target = document.querySelector<HTMLElement>(`[data-guide-target="${current.target}"]`);
    if (!target || target.closest('[inert]')) return;
    target.dataset.guideHighlight = 'true';
    audio.enqueue({ id: `guide:${current.event}`, text: current.text, priority: 'guide', load: client ? signal => client.speech({ cue_id: current.cue }, signal) : undefined });
    return () => { delete target.dataset.guideHighlight; };
  }, [enabled, current, screen, client, audio]);
  if (!enabled || !current) return null;
  return <aside className="guided-tour" aria-label="Обучение"><p>{current.text}</p><div className="dm-actions"><button onClick={() => { audio.enqueue({ id: `repeat:${Date.now()}`, text: current.text, priority: 'guide', load: client ? signal => client.speech({ cue_id: current.cue }, signal) : undefined }); }}>Повторить</button><button onClick={() => { guide.skip(); }}>Пропустить шаг</button><button onClick={() => { audio.stop(); guide.stop(); onDone?.(); }}>Остановить обучение</button><button onClick={() => audio.setMuted(true)}>Продолжить без звука</button></div></aside>;
}

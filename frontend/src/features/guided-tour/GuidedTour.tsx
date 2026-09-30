import { useEffect, useState, useSyncExternalStore } from 'react';
import { cueText } from "../../audio/cues";
import { productText } from "../../shared/productCopy";
import type { Language } from "../../api/release";
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import type { ReleaseClient } from '../../api/release';
import { GuideMachine, type GuideEvent } from './guideMachine';
export function GuidedTour({ audio, client, screen, event, language = "ru", planReady = false, enabled = true, onDone }: { audio: AudioCoordinator; client?: ReleaseClient; screen: string; event?: GuideEvent; language?: Language; planReady?: boolean; enabled?: boolean; onDone?: () => void }) {
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
    audio.enqueue({ id: `guide:${current.event}`, text: cueText(current.cue, language, current.text), priority: 'guide', load: client ? signal => client.speech({ cue_id: current.cue }, signal) : undefined });
    return () => { delete target.dataset.guideHighlight; };
  }, [enabled, current, screen, client, audio, language]);
  const screens:Record<string,readonly string[]>={voice:[],context:['PROFILE'],plan:['PLAN','PROFILE'],exercise:['PLAN'],camera:['CALIBRATION','CAMERA_PERMISSION','MENU','TUTORIAL'],gesture:['PLAN','MENU','TUTORIAL','SCHEDULE'],calibration:['CALIBRATION'],countdown:['COUNTDOWN'],workout:['WORKOUT'],rest:['REST'],results:['RESULTS'],progress:['PROGRESS']};
  if (!enabled || !current || !screens[current.target]?.includes(screen)) return null;
  return <aside className="guided-tour" aria-label="Обучение"><p>{language === "ru" ? current.text : cueText(current.cue, language, current.text)}</p><div className="dm-actions"><button onClick={() => { audio.enqueue({ id: `repeat:${Date.now()}`, text: cueText(current.cue, language, current.text), priority: 'guide', load: client ? signal => client.speech({ cue_id: current.cue }, signal) : undefined }); }}>{productText(language, "repeat")}</button><button onClick={() => { guide.skip(); }}>{productText(language, "skipStep")}</button><button onClick={() => { audio.stop(); guide.stop(); onDone?.(); }}>{productText(language, "stopGuide")}</button><button onClick={() => audio.setMuted(true)}>{productText(language, "silent")}</button></div></aside>;
}

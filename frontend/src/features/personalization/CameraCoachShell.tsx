import { useTranslation } from '../../shared/uiLanguage'
import { localizedSpecText } from './localizedSpecText'
import { GestureTarget } from "../gesture-navigation/GestureTarget";
import { useEffect, useState } from "react";
import type { ActiveExercise } from "../../api/aiCoach";
import type { GenericView } from "../../vision/exercises/generic/types";
import { localized } from "../../vision/exercises/generic/types";
import { CameraCoachingBadge, DistanceCue } from "./components";
export function CameraCoachShell({
  exercise,
  view,
  stage,
  countdown,
  onPause,
  onResume,
  onFinish,
  onCancel,
  voice,
  onVoice,
  onVoiceSettings,
  sessionMode, setNumber=1, reps, onStop,
}: {
  sessionMode?: 'full'|'quick-demo';setNumber?:number;reps?:number;onStop?:()=>void;
  exercise: ActiveExercise;
  view: GenericView | null;
  stage: string;
  countdown: number;
  onPause: () => void;
  onResume: () => void;
  onFinish: (seconds?: number) => void;
  onCancel?: () => void;
  voice: string;
  onVoice: () => void;
  onVoiceSettings?: () => void;
}) {
  const { language: uiLanguage, translateUi } = useTranslation()

  const [seconds, setSeconds] = useState(0);
  const manual = exercise.item.camera_coaching_mode==='manual_only';
  useEffect(() => {
    if (!manual || stage !== "WORKOUT") return;
    const clock = setInterval(
      () => setSeconds((n) => Math.min(3600, n + 1)),
      1000,
    );
    return () => clearInterval(clock);
  }, [manual, stage]);
  const instruction =
    !manual && view && !view.tracking
      ? view.primary
      : manual
        ? "Выполняй в своём темпе"
        : stage === "CALIBRATION"
          ? exercise.spec ? localized(exercise.spec.calibration.messages, uiLanguage) : "Встаньте боком к камере и дождитесь калибровки"
          : stage === "COUNTDOWN"
            ? `Начинаем через ${countdown}`
            : stage === "PAUSED"
              ? "Пауза"
              : (view?.primary ??
                (exercise.spec ? localized(exercise.spec.coach_messages.ready.messages,uiLanguage) : "Контролируемый присед · следуйте подсказке"));
  return (
    <section
      className="coach-shell"
      data-figma-node={manual ? "3:140" : view?.correction ? "3:135" : "3:134"}
    >
      <p className="dm-label">{translateUi(exercise.item.display_name)}{translateUi(" / SET ")}{translateUi(String(setNumber).padStart(2,"0"))}</p>
      <CameraCoachingBadge
        mode={manual ? "manual_only" : "ai_generated"}
        synthetic={exercise.item.exercise_source === "synthetic"}
      />
      <div className="tracking-status">
        {translateUi(manual
          ? "Камера не оценивает это упражнение"
          : view?.tracking
            ? translateUi("TRACKING STEADY · ") + translateUi(exercise.item.camera_angle)
            : "TRACKING / Вернись в кадр")}
      </div>
      <div aria-label={translateUi("Repetitions")}>
        <p className={manual ? "manual-clock" : "rep-counter"}>
          {translateUi(manual
            ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
            : `${reps ?? view?.reps ?? 0} / ${exercise.item.target_reps}`)}
        </p>
        <p className="dm-label">
          {translateUi(manual ? "MANUAL TIMER" : (view?.label ? localizedSpecText(view.label, exercise.spec, uiLanguage) : "Калибровка"))}
        </p>
      </div>
      <div aria-label={translateUi("Recovery and correction")}>
        <DistanceCue
          text={localizedSpecText(instruction, exercise.spec, uiLanguage)}
          correction={view?.correction}
          tracking={view?.tracking}
        />
        <p className="secondary">
          {translateUi(manual
            ? exercise.item.instruction
            : localizedSpecText(view?.secondary || exercise.item.tempo_hint, exercise.spec, uiLanguage))}
        </p>
      </div>
      <div className="dm-actions">
        <GestureTarget id="session-pause-resume" disabled={stage==='CALIBRATION'||stage==='COUNTDOWN'} onSelect={stage==='PAUSED'?onResume:onPause}>{translateUi(stage==='PAUSED'?'Продолжить':'Пауза')}</GestureTarget>
        <GestureTarget id="session-complete-current" onSelect={()=>stage==='CALIBRATION'||stage==='COUNTDOWN'?onCancel?.():onFinish(seconds)}>{translateUi(manual?'Отметить выполненным':stage==='CALIBRATION'||stage==='COUNTDOWN'?'Назад к плану':sessionMode?'Остановить тренировку':'Завершить подход')}</GestureTarget>
        {manual&&onStop&&<GestureTarget id="session-stop-manual" onSelect={onStop}>{translateUi("Остановить тренировку")}</GestureTarget>}
        <button onClick={onVoice}>{translateUi(voice)}</button>
        {onVoiceSettings && <GestureTarget id="session-voice-settings" onSelect={onVoiceSettings}>{translateUi('Голос тренера')}</GestureTarget>}
      </div>
      <p className="secondary">
        {translateUi(exercise.language.toUpperCase())} · {exercise.item.rest_seconds}{translateUi(" с восстановления · ")}{exercise.item.sets}{translateUi(" подхода в плане")}</p>
      <p className="dm-label">
        {translateUi(sessionMode === "full" ? "Полная тренировка · все подходы плана" : sessionMode === "quick-demo" ? "Быстрый demo · один подход, пять повторений" : "Один demo-подход")}
      </p>
    </section>
  );
}

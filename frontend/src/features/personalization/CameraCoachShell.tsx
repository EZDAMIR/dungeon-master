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
}: {
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
}) {
  const [seconds, setSeconds] = useState(0);
  const manual = !exercise.spec;
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
          ? localized(exercise.spec!.calibration.messages, exercise.language)
          : stage === "COUNTDOWN"
            ? `Начинаем через ${countdown}`
            : stage === "PAUSED"
              ? "Пауза"
              : (view?.primary ??
                localized(
                  exercise.spec!.coach_messages.ready.messages,
                  exercise.language,
                ));
  return (
    <section
      className="coach-shell"
      data-figma-node={manual ? "3:140" : view?.correction ? "3:135" : "3:134"}
    >
      <p className="dm-label">{exercise.item.display_name} / SET 01</p>
      <CameraCoachingBadge
        mode={manual ? "manual_only" : "ai_generated"}
        synthetic={exercise.item.exercise_source === "synthetic"}
      />
      <div className="tracking-status">
        {manual
          ? "Камера не оценивает это упражнение"
          : view?.tracking
            ? "TRACKING STEADY · " + exercise.item.camera_angle
            : "TRACKING / Вернись в кадр"}
      </div>
      <div aria-label="Repetitions">
        <p className={manual ? "manual-clock" : "rep-counter"}>
          {manual
            ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
            : `${view?.reps ?? 0} / ${exercise.item.target_reps}`}
        </p>
        <p className="dm-label">
          {manual ? "MANUAL TIMER" : (view?.label ?? "Калибровка")}
        </p>
      </div>
      <div aria-label="Recovery and correction">
        <DistanceCue
          text={instruction}
          correction={view?.correction}
          tracking={view?.tracking}
        />
        <p className="secondary">
          {manual
            ? exercise.item.instruction
            : view?.secondary || exercise.item.tempo_hint}
        </p>
      </div>
      <div className="dm-actions">
        <button
          className="dm-primary"
          disabled={stage === "CALIBRATION" || stage === "COUNTDOWN"}
          onClick={stage === "PAUSED" ? onResume : onPause}
        >
          {stage === "PAUSED" ? "Продолжить" : "Пауза"}
        </button>
        <button
          onClick={() =>
            stage === "CALIBRATION" || stage === "COUNTDOWN"
              ? onCancel?.()
              : onFinish(seconds)
          }
        >
          {manual
            ? "Отметить выполненным"
            : stage === "CALIBRATION" || stage === "COUNTDOWN"
              ? "Назад к плану"
              : "Завершить подход"}
        </button>
        <button onClick={onVoice}>{voice}</button>
      </div>
      <p className="secondary">
        {exercise.language.toUpperCase()} · {exercise.item.rest_seconds} с
        восстановления · {exercise.item.sets} подхода в плане
      </p>
      <p className="dm-label">
        Один demo-подход · остальные подходы доступны повтором
      </p>
    </section>
  );
}

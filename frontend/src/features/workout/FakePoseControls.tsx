import { useLayoutEffect, useState } from "react";
import { FakePoseSource } from "./FakePoseSource";
import { poseStage } from "./RealVisionSource";
import { useGestureStore } from "../gesture-navigation/gestureNavigation";
import { now } from "../../vision/core/clock";
import type { AppMode } from "../../app/modes";
import type { ActiveExercise } from "../../api/aiCoach";
export function FakePoseControls({
  mode,
  exercise,
  onSource,
}: {
  mode: AppMode;
  exercise?: ActiveExercise | null;
  onSource?: (source: FakePoseSource) => void;
}) {
  const store = useGestureStore(),
    [source] = useState(
      () => new FakePoseSource(store.emit, store.poseRaw, store.replayClock),
    );
  useLayoutEffect(() => {
    if (exercise?.spec) {
      source.configureMovement(
        exercise.spec,
        exercise.item.target_reps,
        exercise.language,
      );
      onSource?.(source);
    } else if(exercise?.item.exercise_key==='bodyweight_squat') {source.configureLegacy(exercise.item.target_reps);onSource?.(source)}
  }, [exercise, source, onSource]);
  useLayoutEffect(() => {
    const stage = poseStage(mode);
    if (stage) source.setStage(stage);
    else source.reset();
  }, [mode, source]);
  if (!poseStage(mode)) return null;
  return (
    <details open className="fake-controls">
      <summary>Fake pose · только development</summary>
      <button type="button" onClick={() => source.play("standing-side", now())}>
        Stable calibration / countdown
      </button>
      {!exercise && (
        <button type="button" onClick={() => source.play("wrong-angle", now())}>
          Wrong camera angle
        </button>
      )}
      <button type="button" onClick={() => source.play("body-cropped", now())}>
        Body cropped
      </button>
      <button
        type="button"
        onClick={() => {
          source.standing(now());
          source.play("correct-squat", now());
        }}
      >
        Correct rep
      </button>
      <button
        type="button"
        onClick={() => {
          source.standing(now());
          source.play("shallow-squat", now());
        }}
      >
        Shallow rep
      </button>
      {!exercise && (
        <>
          <button
            type="button"
            onClick={() => {
              source.standing(now());
              source.play("fast-squat", now());
            }}
          >
            Fast rep
          </button>
          <button
            type="button"
            onClick={() => {
              source.standing(now());
              source.play("incomplete-extension", now());
            }}
          >
            Incomplete extension
          </button>
        </>
      )}
      <button type="button" onClick={() => source.lost(now())}>
        Pose tracking lost
      </button>
      {!exercise && (
        <button
          type="button"
          onClick={() => {
            source.standing(now());
            source.play("pause-gesture", now());
          }}
        >
          Pose pause / resume
        </button>
      )}
    </details>
  );
}

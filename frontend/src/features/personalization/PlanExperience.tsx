import { useEffect, useRef, useState } from "react";
import type {
  ActiveExercise,
  AIPlanExercise,
  AIPlanMetadata,
  ExerciseSpec,
  RoutineBlock,
} from "../../api/aiCoach";
import type { BackendStore } from "../../store/backend";
import { localized } from "../../vision/exercises/generic/types";
import { validateSpec } from "../../vision/exercises/generic/validator";
import {
  AIProfileSummary,
  CameraCoachingBadge,
  FlowAction,
  RecoveryPanel,
  SectionHeader,
  SourceChip,
} from "./components";
export function PlanExperience({
  plan,
  planId,
  backend,
  onStart,
  onContext,
  onDetails,
}: {
  plan: AIPlanMetadata;
  planId: string;
  backend: BackendStore;
  onStart: (exercise: ActiveExercise) => void;
  onContext: () => void;
  onDetails?: () => void;
}) {
  const [details, setDetails] = useState<{
      item: AIPlanExercise;
      spec: ExerciseSpec | null;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [why, setWhy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (details && !dialog.current?.open) dialog.current?.showModal();
    else if (!details) dialog.current?.close();
  }, [details]);
  async function open(item: AIPlanExercise) {
    setBusy(true);
    setError("");
    try {
      const spec =
        item.camera_coaching_mode === "manual_only"
          ? null
          : await backend.exerciseSpec(item.exercise_key);
      setDetails({ item, spec });
      onDetails?.();
    } catch {
      setError("Не удалось открыть инструкции. Повторите после подключения.");
    } finally {
      setBusy(false);
    }
  }
  const first = plan.days[0];
  const start = (item: AIPlanExercise, spec: ExerciseSpec | null) => {
    const parsed = validateSpec(spec?.movement_spec);
    setDetails(null);
    onStart({
      item: {
        ...item,
        camera_coaching_mode: parsed.valid
          ? item.camera_coaching_mode
          : "manual_only",
      },
      spec: parsed.valid ? parsed.spec : null,
      planId,
      specRevision: spec?.spec_revision ?? null,
      language: plan.coach_persona.language,
    });
  };
  return (
    <section
      data-figma-node={
        plan.ai_profile.persona_key === "arman"
          ? "3:121"
          : plan.ai_profile.persona_key === "dana"
            ? "3:122"
            : "3:120"
      }
    >
      <div className="plan-intro">
        <div>
          <SectionHeader
            label={`TODAY / ${plan.ai_profile.persona_key?.toUpperCase() ?? "YOUR PLAN"} / ${plan.coach_persona.tone}`}
            title={plan.title}
          >
            <p>{plan.summary}</p>
          </SectionHeader>
          <div className="dm-actions">
            <button onClick={() => setWhy(!why)}>
              Почему этот план подходит именно вам
            </button>
            <button onClick={onContext}>Ваш context</button>
          </div>
          <p className="dm-label">
            {plan.status === "synthetic"
              ? "SYNTHETIC DEMO · FIXTURE PLAN"
              : "AI-GENERATED PLAN"}{" "}
            · {plan.model}
          </p>
        </div>
        <div className="time-budget">
          <strong>{first.estimated_minutes}</strong>
          <div>
            <p className="dm-label">MIN / YOUR TIME</p>
            <p>
              {plan.days.length} дня · {first.items.length} упражнения
            </p>
          </div>
        </div>
      </div>
      {why && (
        <div className="dm-panel" data-figma-node="3:123">
          <h3>Why this plan</h3>
          <ul>
            {plan.why_this_plan.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
          <p>
            Исключены:{" "}
            {plan.excluded_exercises.join(", ") ||
              "Нет дополнительных исключений"}
          </p>
          <p>Стиль тренера: {plan.coach_persona.tone}</p>
          <AIProfileSummary profile={plan.ai_profile} />
        </div>
      )}
      {error && (
        <RecoveryPanel
          message={error}
          onRetry={() => setError("")}
          onBack={onContext}
        />
      )}
      {plan.days.map((day) => (
        <article className="plan-day" key={day.day_index}>
          <h3>
            {day.title} · {day.estimated_minutes} min
          </h3>
          <div className="plan-list">
            {day.items.map((item, index) => (
              <div className="exercise-row" key={item.exercise_key}>
                <span className="dm-label">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{item.display_name}</strong>
                  <p>
                    <small>{item.reason}</small>
                  </p>
                </div>
                <span>
                  {item.sets} × {item.target_reps}
                  <br />
                  <small>
                    {item.tempo_hint} · отдых {item.rest_seconds} с
                  </small>
                </span>
                <div>
                  <CameraCoachingBadge
                    mode={item.camera_coaching_mode}
                    synthetic={plan.status === "synthetic"}
                  />
                  <p>
                    <small>
                      {item.camera_angle === "front"
                        ? "Front view"
                        : item.camera_angle === "side"
                          ? "Side view"
                          : "Camera optional"}
                    </small>
                  </p>
                </div>
                <div className="source-chips">
                  {item.source_references.map((source, i) => (
                    <SourceChip key={i} source={source} onOpen={onContext} />
                  ))}
                </div>
                <div className="dm-actions">
                  <FlowAction
                    id={`details-${day.day_index}-${item.exercise_key}`}
                    disabled={busy}
                    onSelect={() => {
                      void open(item);
                    }}
                  >
                    Инструкции и камера →
                  </FlowAction>
                  <button disabled title="Sprint 4A: swap пока недоступен">
                    Swap unavailable
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
      {plan.routine_blocks.length > 0 && (
        <>
          <SectionHeader
            label="LIGHTWEIGHT ROUTINES / SEPARATE FROM YOUR WORKOUT"
            title="A little every day."
          />
          <div className="routine-list">
            {plan.routine_blocks.map((block) => (
              <RoutineCard key={block.routine_type} block={block} />
            ))}
          </div>
        </>
      )}
      <div className="dm-actions">
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void backend
              .generatePersonalized()
              .catch(() =>
                setError(
                  "AI временно недоступен. Повторите или откройте базовый план.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          Создать другой вариант
        </button>
        <button onClick={onContext}>Изменить context</button>
      </div>
      <dialog
        ref={dialog}
        className="dm-sheet"
        data-guide-target="exercise"
        onCancel={() => setDetails(null)}
      >
        {details && (
          <div className="editorial-grid" data-figma-node="3:124">
            <div className="detail-stage">
              <p className="dm-label">ILLUSTRATIVE PREVIEW / NOT LIVE VIDEO</p>
              <img
                className="illustration"
                src={`${import.meta.env.BASE_URL}design/${details.item.display_name.toLowerCase().includes("squat") ? "pose-squat" : "pose-standing"}.svg`}
                alt="Illustrative movement position"
              />
              <h2>{details.item.display_name}</h2>
              <CameraCoachingBadge
                mode={
                  details.spec?.status === "valid"
                    ? "ai_generated"
                    : "manual_only"
                }
                synthetic={plan.status === "synthetic"}
              />
            </div>
            <div className="dm-panel">
              <SectionHeader
                label="EXERCISE / YOUR SELECTION"
                title="A steady start."
              />
              <h3>
                {details.item.sets} × {details.item.target_reps}
              </h3>
              <p>{details.item.instruction}</p>
              <p>{details.item.reason}</p>
              {details.spec?.movement_spec ? (
                <>
                  <p>
                    Камера: {details.spec.movement_spec.camera.preferred_angle}
                  </p>
                  <p>
                    {localized(
                      details.spec.movement_spec.calibration.messages,
                      plan.coach_persona.language,
                    )}
                  </p>
                  <p>
                    Ключевые суставы:{" "}
                    {details.spec.movement_spec.camera.required_landmarks.join(
                      ", ",
                    )}
                  </p>
                  <p>
                    Этапы движения:{" "}
                    {details.spec.movement_spec.phases
                      .map((p) =>
                        localized(p.messages, plan.coach_persona.language, 32),
                      )
                      .join(" → ")}
                  </p>
                  <p>
                    Подсказки:{" "}
                    {details.spec.movement_spec.error_rules
                      .map((r) =>
                        localized(r.messages, plan.coach_persona.language),
                      )
                      .join(" · ")}
                  </p>
                </>
              ) : (
                <p>Для этого упражнения пока доступно ручное выполнение</p>
              )}
              <div className="dm-actions">
                <FlowAction
                  id="exercise-start"
                  onSelect={() => start(details.item, details.spec)}
                >
                  Начать{" "}
                  {details.spec?.status === "valid" ? "Camera Coach" : "Manual"}{" "}
                  →
                </FlowAction>
                <button onClick={() => setDetails(null)}>Закрыть</button>
                <button disabled>Swap unavailable</button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
function RoutineCard({ block }: { block: RoutineBlock }) {
  const [started, setStarted] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [complete, setComplete] = useState(false);
  const target = block.items.reduce((n, item) => n + item.duration_seconds, 0);
  useEffect(() => {
    if (!started || complete) return;
    const clock = setInterval(
      () => setElapsed((n) => Math.min(target, n + 1)),
      1000,
    );
    return () => clearInterval(clock);
  }, [started, complete, target]);
  return (
    <article className="dm-panel" data-figma-node="44:1223">
      <p className="dm-label">{block.routine_type} / MANUAL TIMER</p>
      <h3>{block.title}</h3>
      <p>{block.estimated_minutes} min</p>
      {block.items.map((item, i) => (
        <p key={i}>
          {item.title} · {item.instruction}
        </p>
      ))}
      {started && (
        <p>
          {elapsed} / {target} s
        </p>
      )}
      <button
        onClick={() => {
          if (started) {
            setComplete(true);
            setStarted(false);
          } else {
            setStarted(true);
            setElapsed(0);
            setComplete(false);
          }
        }}
      >
        {complete
          ? "Повторить"
          : started
            ? "Отметить выполненным"
            : "Начать routine"}
      </button>
      {complete && (
        <p>Выполнено вручную · routine отдельно от основной тренировки</p>
      )}
    </article>
  );
}

import { useTranslation } from '../../shared/uiLanguage'
import { GestureTarget } from "../gesture-navigation/GestureTarget";
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
  onStartSession,
  onQuickDemo,
}: {
  plan: AIPlanMetadata;
  planId: string;
  backend: BackendStore;
  onStart: (exercise: ActiveExercise) => void;
  onContext: () => void;
  onDetails?: () => void;
  onStartSession?: (exercises: ActiveExercise[]) => void;
  onQuickDemo?: (exercise: ActiveExercise) => void;
}) {
  const { language: uiLanguage, translateUi, translateUiList } = useTranslation()

  const [details, setDetails] = useState<{
      item: AIPlanExercise;
      spec: ExerciseSpec | null;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [why, setWhy] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  useEffect(() => () => { requestController.current?.abort(); void backend.cancelGeneration().catch(() => {}); }, [backend]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (details && !dialog.current?.open) dialog.current?.showModal();
    else if (!details) dialog.current?.close();
  }, [details]);
  async function open(item: AIPlanExercise) {
    setBusy(true);
    setError("");
    const controller = new AbortController(); requestController.current?.abort(); requestController.current = controller;
    try {
      const spec =
        item.camera_coaching_mode === "manual_only"
          ? null
          : await backend.exerciseSpec(item.exercise_key, controller.signal);
      if (controller.signal.aborted) return;
      setDetails({ item, spec });
      onDetails?.();
    } catch {
      if (controller.signal.aborted) return;
      setError("Не удалось открыть инструкции. Повторите после подключения.");
    } finally {
      setBusy(false);
    }
  }
  const first = plan.days[0];
  const start = (item: AIPlanExercise, spec: ExerciseSpec | null, quick = false) => {
    const parsed = validateSpec(spec?.movement_spec);
    setDetails(null);
    (quick && onQuickDemo ? onQuickDemo : onStart)({
      item: {
        ...item,
        camera_coaching_mode: parsed.valid
          ? item.camera_coaching_mode
          : "manual_only",
      },
      spec: parsed.valid ? parsed.spec : null,
      planId,
      specRevision: spec?.spec_revision ?? null,
      language: uiLanguage,
    });
  };
  async function startDay(items: AIPlanExercise[]) {
    if (!onStartSession || busy) return;
    setBusy(true); setError("");
    const controller = new AbortController(); requestController.current?.abort(); requestController.current = controller;
    try {
      const exercises: ActiveExercise[] = [];
      for (const item of items) {
        const declaration = item.camera_coaching_mode === "manual_only" ? null : await backend.exerciseSpec(item.exercise_key, controller.signal);
        const parsed = validateSpec(declaration?.movement_spec);
        exercises.push({ item: { ...item, camera_coaching_mode: parsed.valid ? item.camera_coaching_mode : "manual_only" }, spec: parsed.valid ? parsed.spec : null, planId, specRevision: declaration?.spec_revision ?? null, language: plan.coach_persona.language });
      }
      if (!controller.signal.aborted) onStartSession(exercises);
    } catch { if (controller.signal.aborted) return; setError("Не удалось подготовить упражнения. План сохранён. Повторите после подключения."); }
    finally { setBusy(false); }
  }
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
            label={`${translateUi("TODAY")} / ${plan.ai_profile.persona_key?.toUpperCase() ?? translateUi("YOUR PLAN")} / ${translateUi(plan.coach_persona.tone)}`}
            title={translateUi(plan.title)}
          >
            <p>{translateUi(plan.summary)}</p>
          </SectionHeader>
          <div className="dm-actions">
            <GestureTarget id="plan-why" onSelect={() => setWhy(!why)}>{translateUi("Почему этот план подходит именно вам")}</GestureTarget>
            <GestureTarget id="plan-context" onSelect={onContext}>{translateUi("Ваш context")}</GestureTarget>
          </div>
          <p className="dm-label">
            {translateUi(plan.status === "synthetic"
              ? "SYNTHETIC DEMO · FIXTURE PLAN"
              : "AI-GENERATED PLAN")}{translateUi(" ")}
            · {translateUi(plan.model)}
          </p>
        </div>
        <div className="time-budget">
          <strong>{first.estimated_minutes}</strong>
          <div>
            <p className="dm-label">{translateUi("MIN / YOUR TIME")}</p>
            <p>
              {plan.days.length}{translateUi(" дня · ")}{first.items.length}{translateUi(" упражнения")}</p>
          </div>
        </div>
      </div>
      {why && (
        <div className="dm-panel" data-figma-node="3:123">
          <h3>{translateUi("Why this plan")}</h3>
          <ul>
            {plan.why_this_plan.map((reason, i) => (
              <li key={i}>{translateUi(reason)}</li>
            ))}
          </ul>
          <p>{translateUi("Исключены:")}{translateUi(" ")}
            {translateUi(translateUiList(plan.excluded_exercises) ||
              "Нет дополнительных исключений")}
          </p>
          <p>{translateUi("Стиль тренера: ")}{translateUi(plan.coach_persona.tone)}</p>
          <AIProfileSummary profile={plan.ai_profile} />
        </div>
      )}
      {error && (
        <RecoveryPanel
          message={translateUi(error)}
          onRetry={() => setError("")}
          onBack={onContext}
        />
      )}
      {plan.days.map((day) => (
        <article className="plan-day" key={day.day_index}>
          <h3>
            {translateUi(day.title)} · {day.estimated_minutes}{translateUi(" min")}</h3>
          {onStartSession && <FlowAction id={`day-start-${day.day_index}`} disabled={busy} onSelect={() => { void startDay(day.items); }}>{translateUi("Начать тренировку дня · ")}{day.items.reduce((total, item) => total + item.sets, 0)}{translateUi(" подходов")}</FlowAction>}
          <div className="plan-list">
            {day.items.map((item, index) => (
              <div className="exercise-row" key={item.exercise_key}>
                <span className="dm-label">
                  {translateUi(String(index + 1).padStart(2, "0"))}
                </span>
                <div>
                  <strong>{translateUi(item.display_name)}</strong>
                  <p>
                    <small>{translateUi(item.reason)}</small>
                  </p>
                </div>
                <span>
                  {item.sets} × {item.target_reps}
                  <br />
                  <small>
                    {translateUi(item.tempo_hint)}{translateUi(" · отдых ")}{item.rest_seconds}{translateUi(" с")}</small>
                </span>
                <div>
                  <CameraCoachingBadge
                    mode={item.camera_coaching_mode}
                    synthetic={plan.status === "synthetic"}
                  />
                  <p>
                    <small>
                      {translateUi(item.camera_angle === "front"
                        ? "Front view"
                        : item.camera_angle === "side"
                          ? "Side view"
                          : "Camera optional")}
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
                  >{translateUi("Инструкции и камера →")}</FlowAction>
                  <button disabled title={translateUi("Sprint 4A: swap пока недоступен")}>{translateUi("Swap unavailable")}</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
      {plan.routine_blocks.length > 0 && (
        <>
          <SectionHeader
            label={translateUi("LIGHTWEIGHT ROUTINES / SEPARATE FROM YOUR WORKOUT")}
            title={translateUi("A little every day.")}
          />
          <div className="routine-list">
            {plan.routine_blocks.map((block) => (
              <RoutineCard key={block.routine_type} block={block} />
            ))}
          </div>
        </>
      )}
      <div className="dm-actions">
        <GestureTarget id="plan-regenerate"
          disabled={busy}
          onSelect={() => {
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
        >{translateUi("Создать другой вариант")}</GestureTarget>
        <GestureTarget id="plan-edit-context" onSelect={onContext}>{translateUi("Изменить context")}</GestureTarget>
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
              <p className="dm-label">{translateUi("ILLUSTRATIVE PREVIEW / NOT LIVE VIDEO")}</p>
              <img
                className="illustration"
                src={`${import.meta.env.BASE_URL}design/${details.item.display_name.toLowerCase().includes("squat") ? "pose-squat" : "pose-standing"}.svg`}
                alt={translateUi("Illustrative movement position")}
              />
              <h2>{translateUi(details.item.display_name)}</h2>
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
                label={translateUi("EXERCISE / YOUR SELECTION")}
                title={translateUi("A steady start.")}
              />
              <h3>
                {details.item.sets} × {details.item.target_reps}
              </h3>
              <p>{translateUi(details.item.instruction)}</p>
              <p>{translateUi(details.item.reason)}</p>
              {details.spec?.movement_spec ? (
                <>
                  <p>{translateUi("Камера: ")}{translateUi(details.spec.movement_spec.camera.preferred_angle)}
                  </p>
                  <p>
                    {translateUi(localized(
                      details.spec.movement_spec.calibration.messages,
                      uiLanguage,
                    ))}
                  </p>
                  <p>{translateUi("Ключевые суставы:")}{translateUi(" ")}
                    {translateUi(translateUiList(details.spec.movement_spec.camera.required_landmarks))}
                  </p>
                  <p>{translateUi("Этапы движения:")}{translateUi(" ")}
                    {translateUi(details.spec.movement_spec.phases
                      .map((p) =>
                        localized(p.messages, uiLanguage, 32),
                      )
                      .join(" → "))}
                  </p>
                  <p>{translateUi("Подсказки:")}{translateUi(" ")}
                    {translateUi(details.spec.movement_spec.error_rules
                      .map((r) =>
                        localized(r.messages, uiLanguage),
                      )
                      .join(" · "))}
                  </p>
                </>
              ) : (
                <p>{translateUi("Для этого упражнения пока доступно ручное выполнение")}</p>
              )}
              <div className="dm-actions">
                <FlowAction
                  id="exercise-start"
                  onSelect={() => start(details.item, details.spec)}
                >{translateUi("Начать")}{translateUi(" ")}
                  {translateUi(details.spec?.status === "valid" ? "Camera Coach" : "Manual")}{translateUi(" ")}
                  →
                </FlowAction>
                {onQuickDemo && <FlowAction id="exercise-quick-demo" onSelect={() => start(details.item, details.spec, true)}>{translateUi("Быстрая демонстрация · 1 × 5")}</FlowAction>}
                <GestureTarget id="plan-close-details" onSelect={() => setDetails(null)}>{translateUi("Закрыть")}</GestureTarget>
                <button disabled>{translateUi("Swap unavailable")}</button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
function RoutineCard({ block }: { block: RoutineBlock }) {
  const { translateUi } = useTranslation()

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
      <p className="dm-label">{translateUi(block.routine_type)}{translateUi(" / MANUAL TIMER")}</p>
      <h3>{translateUi(block.title)}</h3>
      <p>{block.estimated_minutes}{translateUi(" min")}</p>
      {block.items.map((item, i) => (
        <p key={i}>
          {translateUi(item.title)} · {translateUi(item.instruction)}
        </p>
      ))}
      {started && (
        <p>
          {elapsed} / {target}{translateUi(" s")}</p>
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
        {translateUi(complete
          ? "Повторить"
          : started
            ? "Отметить выполненным"
            : "Начать routine")}
      </button>
      {complete && (
        <p>{translateUi("Выполнено вручную · routine отдельно от основной тренировки")}</p>
      )}
    </article>
  );
}

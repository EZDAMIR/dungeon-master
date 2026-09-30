import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SourceReference } from "../../api/aiCoach";
import type { AIProfile } from "../../api/aiCoach";
import { GestureTarget } from "../gesture-navigation/GestureTarget";
export function SectionHeader({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-header">
      <p className="dm-label">{label}</p>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function SourceChip({
  source,
  onOpen,
}: {
  source: SourceReference;
  onOpen?: () => void;
}) {
  const names = {
    profile: "Из профиля",
    preferences: "Из предпочтений",
    document: "Из документа",
    progress: "Из прогресса",
  };
  return onOpen ? (
    <button className="source-chip" onClick={onOpen}>
      {names[source.type]}: {source.label}
    </button>
  ) : (
    <span className="source-chip">
      {names[source.type]}: {source.label}
    </span>
  );
}
export function AIProfileSummary({ profile }: { profile: AIProfile }) {
  return (
    <div className="ai-summary dm-panel success" data-figma-node="3:145">
      <h3>Что тренер учёл</h3>
      <p>{profile.summary}</p>
      <p>
        {profile.schedule.days_per_week} дня ·{" "}
        {profile.schedule.minutes_per_session} минут ·{" "}
        {profile.equipment.join(", ")} · {profile.coach_persona.tone}
      </p>
      <p>
        Цели: {profile.primary_goals.join(", ")} · Уровень:{" "}
        {profile.fitness_level}
      </p>
      <p>Предпочтения: {profile.preferences.join(", ") || "Не заданы"}</p>
      <p>
        Подтверждённые ограничения:{" "}
        {profile.constraints.join(", ") || "Не заданы"}
      </p>
      <ul>
        {profile.personalization_highlights.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
      <div className="source-chips">
        {profile.source_highlights.map((s, i) => (
          <SourceChip
            key={i}
            source={{
              type: s.source_type,
              label: s.label,
              source_id: s.source_id,
            }}
          />
        ))}
      </div>
    </div>
  );
}
export function RecoveryPanel({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="dm-status error" role="alert" data-figma-node="3:146">
      <h3>Попробуем ещё раз</h3>
      <p>{message}</p>
      <div className="dm-actions">
        <button onClick={onRetry}>Повторить</button>
        <button onClick={onBack}>Назад</button>
      </div>
    </div>
  );
}
export function CameraCoachingBadge({
  mode,
  synthetic = false,
}: {
  mode: string;
  synthetic?: boolean;
}) {
  return (
    <span
      className={`coach-badge ${mode === "ai_generated" ? "experimental" : ""}`}
    >
      {mode === "predefined"
        ? "Camera Coach"
        : mode === "ai_generated"
          ? synthetic
            ? "Camera Coach · synthetic demo"
            : "AI-generated camera coaching"
          : "Manual · ручное выполнение"}
    </span>
  );
}
export function DistanceCue({
  text,
  correction = false,
  tracking = true,
}: {
  text: string;
  correction?: boolean;
  tracking?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null),
    [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      const e = ref.current;
      if (e)
        setOverflow(
          e.scrollHeight > parseFloat(getComputedStyle(e).lineHeight) * 2 + 2,
        );
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);
  return (
    <div style={{ position: "relative" }}>
      <span ref={ref} className="distance-cue cue-measure" aria-hidden="true">
        {text}
      </span>
      <p
        className="distance-cue"
        data-correction={correction}
        aria-live="polite"
      >
        {overflow ? (tracking ? "Контроль движения" : "Вернись в кадр") : text}
      </p>
    </div>
  );
}
export function FlowAction({
  id,
  onSelect,
  disabled = false,
  children,
}: {
  id: string;
  onSelect: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <GestureTarget id={id} onSelect={onSelect} disabled={disabled}>
      {children}
    </GestureTarget>
  );
}

export function MovementPreview({
  title,
  label,
}: {
  title: string;
  label: string;
}) {
  return (
    <div className="guided-preview" data-figma-node="3:140">
      <p className="dm-label">{label}</p>
      <img
        src={`${import.meta.env.BASE_URL}design/${title.toLowerCase().includes("squat") ? "pose-squat" : "pose-standing"}.svg`}
        alt="Illustrative movement position"
      />
    </div>
  );
}

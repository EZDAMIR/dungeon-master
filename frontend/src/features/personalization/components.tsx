import { useTranslation } from '../../shared/uiLanguage'
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
  const { translateUi } = useTranslation()

  return (
    <div className="section-header">
      <p className="dm-label">{translateUi(label)}</p>
      <h2>{translateUi(title)}</h2>
      {translateUi(children)}
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
  const { translateUi } = useTranslation()

  const names = {
    profile: "Из профиля",
    preferences: "Из предпочтений",
    document: "Из документа",
    progress: "Из прогресса",
  };
  return onOpen ? (
    <button className="source-chip" onClick={onOpen}>
      {translateUi(names[source.type])}: {translateUi(source.label)}
    </button>
  ) : (
    <span className="source-chip">
      {translateUi(names[source.type])}: {translateUi(source.label)}
    </span>
  );
}
export function AIProfileSummary({ profile }: { profile: AIProfile }) {
  const { translateUi, translateUiList } = useTranslation()

  return (
    <div className="ai-summary dm-panel success" data-figma-node="3:145">
      <h3>{translateUi("Что тренер учёл")}</h3>
      <p>{translateUi(profile.summary)}</p>
      <p>
        {profile.schedule.days_per_week}{translateUi(" дня ·")}{translateUi(" ")}
        {profile.schedule.minutes_per_session}{translateUi(" минут ·")}{translateUi(" ")}
        {translateUi(translateUiList(profile.equipment))} · {translateUi(profile.coach_persona.tone)}
      </p>
      <p>{translateUi("Цели: ")}{translateUi(translateUiList(profile.primary_goals))}{translateUi(" · Уровень:")}{translateUi(" ")}
        {translateUi(profile.fitness_level)}
      </p>
      <p>{translateUi("Предпочтения: ")}{translateUi(translateUiList(profile.preferences) || "Не заданы")}</p>
      <p>{translateUi("Подтверждённые ограничения:")}{translateUi(" ")}
        {translateUi(translateUiList(profile.constraints) || "Не заданы")}
      </p>
      <ul>
        {profile.personalization_highlights.map((text, i) => (
          <li key={i}>{translateUi(text)}</li>
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
  const { translateUi } = useTranslation()

  return (
    <div className="dm-status error" role="alert" data-figma-node="3:146">
      <h3>{translateUi("Попробуем ещё раз")}</h3>
      <p>{translateUi(message)}</p>
      <div className="dm-actions">
        <button onClick={onRetry}>{translateUi("Повторить")}</button>
        <button onClick={onBack}>{translateUi("Назад")}</button>
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
  const { translateUi } = useTranslation()

  return (
    <span
      className={`coach-badge ${mode === "ai_generated" ? "experimental" : ""}`}
    >
      {translateUi(mode === "predefined"
        ? "Camera Coach"
        : mode === "ai_generated"
          ? synthetic
            ? "Camera Coach · synthetic demo"
            : "AI-generated camera coaching"
          : "Manual · ручное выполнение")}
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
  const { translateUi } = useTranslation()

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
        {translateUi(text)}
      </span>
      <p
        className="distance-cue"
        data-correction={correction}
        aria-live="polite"
      >
        {translateUi(overflow ? (tracking ? "Контроль движения" : "Вернись в кадр") : text)}
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
  const { translateUi } = useTranslation()

  return (
    <GestureTarget id={id} onSelect={onSelect} disabled={disabled}>
      {translateUi(children)}
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
  const { translateUi } = useTranslation()

  return (
    <div className="guided-preview" data-figma-node="3:140">
      <p className="dm-label">{translateUi(label)}</p>
      <img
        src={`${import.meta.env.BASE_URL}design/${title.toLowerCase().includes("squat") ? "pose-squat" : "pose-standing"}.svg`}
        alt={translateUi("Illustrative movement position")}
      />
    </div>
  );
}

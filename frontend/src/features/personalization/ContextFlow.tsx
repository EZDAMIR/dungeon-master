import { useTranslation } from '../../shared/uiLanguage'
import { GestureTarget } from "../gesture-navigation/GestureTarget";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { AIContext, CoachStyle, PersonaKey } from "../../api/aiCoach";
import type { Language } from "../../vision/exercises/generic/types";
import type { BackendSnapshot, BackendStore } from "../../store/backend";
import { ProfileSettings } from "../profile/ProfileSettings";
import {
  AIProfileSummary,
  FlowAction,
  RecoveryPanel,
  SectionHeader,
} from "./components";
import { demoPersonas as personas } from "./demoPersonas";
const empty: AIContext = {
  self_description: "",
  preferred_coach_style: "supportive",
  preferred_language: "ru",
  additional_preferences: {},
};
export function ContextFlow({
  backend,
  remote,
  jury,
  onPlan,
  onBack,
  step: routedStep,
  onStepChange,
}: {
  backend: BackendStore;
  remote: BackendSnapshot;
  jury: boolean;
  onPlan: () => void;
  onBack: () => void;
  step?: "intake" | "documents" | "review";
  onStepChange?: (step: "intake" | "documents" | "review") => void;
}) {
  const { translateUi, translateUiList } = useTranslation()

  useEffect(() => () => { void backend.cancelGeneration().catch(() => {}); }, [backend]);
  const [localStep, setLocalStep] = useState<"intake" | "documents" | "review">(
      "intake",
    ),
    [switcher, setSwitcher] = useState(jury && !remote.context);
  const step = routedStep ?? localStep;
  const setStep = onStepChange ?? setLocalStep;
  const [edited, setDraft] = useState<AIContext | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [deleted, setDeleted] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null),
    [settings, setSettings] = useState(false);
  useEffect(() => {
    if (remote.auth && !remote.context)
      void backend.loadContext().catch(() => {});
  }, [backend, remote.auth, remote.context]);
  const draft = edited ?? remote.context ?? empty;
  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? "Demo доступно только в development или при ENABLE_DEMO_PERSONAS=true"
          : e instanceof ApiError && e.kind === "offline"
            ? "Нет подключения. Проверьте сеть и повторите действие"
            : "Действие не завершено. Проверьте подключение и повторите",
      );
    } finally {
      setBusy("");
    }
  }
  const choose = (key: PersonaKey) => {
    void run("Загружаем synthetic persona", async () => {
      await backend.loadPersona(key);
      setDraft(null);
      setSwitcher(false);
      setStep("intake");
    });
  };
  const generate = () => {
    void run("Подготавливаем персональный план", async () => {
      await backend.generatePersonalized();
      onPlan();
    });
  };
  if (switcher)
    return (
      <section data-figma-node="3:112">
        <SectionHeader
          label={translateUi("JURY / SYNTHETIC PROFILES")}
          title={translateUi("Same coach. Different starting points.")}
        >
          <p>{translateUi("Выберите вымышленный context. Каждый профиль открывается в отдельной гостевой сессии.")}</p>
        </SectionHeader>
        <div className="persona-list">
          {personas.map((p) => (
            <article className="persona-card" key={p.key}>
              <p className="dm-label">{translateUi("FICTIONAL PROFILE / ")}{translateUi(p.key)}</p>
              <h2>{translateUi(p.title)}</h2>
              <h3>{translateUi(p.subtitle)}</h3>
              <p>{translateUi(p.details)}</p>
              <p>{translateUi(p.story)}</p>
              <div className="dm-actions">
                <FlowAction
                  id={"persona-" + p.key}
                  disabled={!!busy}
                  onSelect={() => choose(p.key)}
                >{translateUi("Выбрать ")}{translateUi(p.title)}
                </FlowAction>
              </div>
            </article>
          ))}
        </div>
        {busy && <p role="status">{translateUi(busy)}</p>}
        {error && (
          <RecoveryPanel
            message={translateUi(error)}
            onRetry={() => setError("")}
            onBack={() => setSwitcher(false)}
          />
        )}
      </section>
    );
  return (
    <section
      data-figma-node={
        step === "intake" ? "3:113" : step === "documents" ? "3:115" : "3:117"
      }
    >
      {jury && (
        <button
          className="dm-ghost"
          disabled={!!busy}
          onClick={() => setSwitcher(true)}
        >{translateUi("Сменить persona")}</button>
      )}
      {error && (
        <RecoveryPanel
          message={translateUi(error)}
          onRetry={() => setError("")}
          onBack={() => {
            setError("");
            setStep("intake");
          }}
        />
      )}
      {remote.generationJob && <div className="dm-status" role="status"><p>{translateUi("Генерация: ")}{translateUi(remote.generationJob.status)} · {translateUi(remote.generationJob.stage)}</p>{remote.generationJob.total_specs > 0 && <p>{translateUi("Подготовлено упражнений: ")}{remote.generationJob.completed_specs} / {remote.generationJob.total_specs}</p>}{["queued", "running"].includes(remote.generationJob.status) && <button onClick={() => { void backend.cancelGeneration(); }}>{translateUi("Отменить генерацию")}</button>}</div>}
      {busy && (
        <div
          role="status"
          className="dm-status"
          data-figma-node={step === "documents" ? "3:116" : "3:119"}
        >
          <h3>{translateUi(busy)}</h3>
          <p>{translateUi("Можно вернуться после завершения.")}</p>
        </div>
      )}
      {step === "intake" ? (
        <div className="context-grid">
          <aside className="dm-panel dark">
            <p className="dm-label">{translateUi("01 / YOUR STARTING POINT")}</p>
            <h1>{translateUi("A LITTLE CONTEXT.")}<br />{translateUi("A BETTER START.")}</h1>
            <p>{translateUi("Расскажите о целях, времени, опыте и предпочтениях. Вы подтверждаете информацию до создания плана.")}</p>
            <p>{translateUi("Sprint 4A demo использует только synthetic data.")}</p>
          </aside>
          <div className="dm-panel">
            <SectionHeader
              label={translateUi("STEP 1 OF 3 / ABOUT YOU")}
              title={translateUi("Tell us about you")}
            />
            <label className="dm-field">
              <span>{translateUi("Ваш context")}</span>
              <textarea
                aria-label={translateUi("Описание себя")}
                maxLength={5000}
                value={draft.self_description}
                onChange={(e) =>
                  setDraft({ ...draft, self_description: e.target.value })
                }
              />
            </label>
            <label className="dm-field">
              <span>{translateUi("Стиль тренера")}</span>
              <select
                value={draft.preferred_coach_style}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    preferred_coach_style: e.target.value as CoachStyle,
                  })
                }
              >
                {["calm", "supportive", "energetic", "strict"].map((style) => (
                  <option key={style} value={style}>{translateUi(style)}</option>
                ))}
              </select>
            </label>
            <label className="dm-field">
              <span>{translateUi("Язык подсказок")}</span>
              <select
                value={draft.preferred_language}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    preferred_language: e.target.value as Language,
                  })
                }
              >
                <option value="ru">{translateUi("Русский")}</option>
                <option value="kk">{translateUi("Қазақша")}</option>
                <option value="en">{translateUi("English")}</option>
              </select>
            </label>
            <p>
              {remote.profile.session_minutes}{translateUi(" минут ·")}{translateUi(" ")}
              {remote.profile.days_per_week}{translateUi(" дня ·")}{translateUi(" ")}
              {translateUi(translateUiList(remote.profile.equipment))}
            </p>
            <GestureTarget id="context-settings" className="dm-ghost" onSelect={() => setSettings(!settings)}>{translateUi("Цели, расписание и оборудование")}</GestureTarget>
            {settings && (
              <ProfileSettings
                profile={remote.profile}
                message={translateUi(remote.profileMessage)}
                onSave={(p) => backend.saveProfile(p)}
                onBack={() => setSettings(false)}
              />
            )}
            <div className="dm-actions">
              <FlowAction
                id="context-continue"
                disabled={!!busy || !draft.self_description.trim()}
                onSelect={() => {
                  void run("Сохраняем context", async () => {
                    await backend.saveContext(draft);
                    setStep("documents");
                  });
                }}
              >{translateUi("Продолжить →")}</FlowAction>
              <GestureTarget id="context-back" onSelect={onBack}>{translateUi("Назад")}</GestureTarget>
            </div>
          </div>
        </div>
      ) : step === "documents" ? (
        <>
          <SectionHeader
            label={translateUi("STEP 2 OF 3 / OPTIONAL CONTEXT")}
            title={translateUi("Bring your context. Keep control.")}
          >
            <p>{translateUi("PDF с текстовым слоем, TXT или Markdown · до 5 MB · до 5 источников.")}</p>
          </SectionHeader>
          <div className="editorial-grid">
            <div className="dm-panel">
              <h3>{translateUi("Add a document or personal notes")}</h3>
              <p>{translateUi("Extracted facts не используются до подтверждения.")}</p>
              <label className="dm-field">
                <span>{translateUi("Выберите synthetic source document")}</span>
                <input
                  type="file"
                  accept="application/pdf,text/plain,text/markdown,.md"
                  disabled={!!busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void run("Загрузка и извлечение текста", () =>
                        backend.uploadDocument(file),
                      );
                    e.target.value = "";
                  }}
                />
              </label>
              {remote.documents.map((d) => (
                <article className="document-card" key={d.id}>
                  <h3>{translateUi(d.filename)}</h3>
                  <p>
                    {translateUi(d.status === "failed"
                      ? d.message
                      : `${d.extracted_character_count} символов · ${d.facts.length} extracted facts`)}
                  </p>
                  <div className="dm-actions">
                    <button
                      disabled={!!busy || !d.facts.length}
                      onClick={() => setStep("review")}
                    >{translateUi("Открыть extracted facts")}</button>
                    <button
                      className="dm-danger"
                      onClick={() => setDeleteId(d.id)}
                    >{translateUi("Удалить источник")}</button>
                  </div>
                </article>
              ))}
            </div>
            <aside className="dm-panel success">
              <h2>{translateUi("YOUR INFORMATION.")}<br />{translateUi("YOUR CHOICE.")}</h2>
              <p>{translateUi("Проверьте extracted facts. Отклоните лишнее. Источник можно удалить.")}</p>
              <p>{translateUi("В плане будут видны короткие ссылки на подтверждённые источники.")}</p>
            </aside>
          </div>
          <div className="dm-actions">
            <FlowAction
              id="documents-review"
              disabled={!!busy}
              onSelect={() => setStep("review")}
            >
              {translateUi(remote.documents.length
                ? "Перейти к review →"
                : "Продолжить без документа →")}
            </FlowAction>
            <GestureTarget id="context-intake-back" onSelect={() => setStep("intake")}>{translateUi("Назад")}</GestureTarget>
          </div>
        </>
      ) : (
        <>
          <SectionHeader
            label={translateUi("CONTEXT REVIEW / NOTHING IS ASSUMED")}
            title={translateUi("Is this a fair starting point?")}
          >
            <p>{translateUi("Подтверждаются отдельные факты. Вы можете пропустить документ и продолжить по своему context.")}</p>
          </SectionHeader>
          <div className="editorial-grid">
            <div className="fact-list">
              {remote.documents.flatMap((d) =>
                d.facts.map((f) => (
                  <article
                    className="fact-card"
                    data-status={f.status}
                    key={f.id}
                  >
                    <p className="dm-label">{translateUi(d.filename)}</p>
                    <h3>{translateUi(f.normalized_fact)}</h3>
                    <blockquote>“{translateUi(f.source_excerpt)}”</blockquote>
                    {f.status === "confirmed" ? (
                      <p>{translateUi("Использовано для персонализации")}</p>
                    ) : f.status === "rejected" ? (
                      <p>{translateUi("Отклонено · не используется")}</p>
                    ) : (
                      <p>{translateUi("Ожидает подтверждения")}</p>
                    )}
                    <div className="dm-actions">
                      <FlowAction
                        id={"confirm-" + f.id}
                        disabled={!!busy || f.status === "confirmed"}
                        onSelect={() => {
                          void run("Подтверждаем факт", () =>
                            backend.decideFact(d.id, f.id, "confirmed"),
                          );
                        }}
                      >{translateUi("Confirm")}</FlowAction>
                      <FlowAction
                        id={"reject-" + f.id}
                        disabled={!!busy || f.status === "rejected"}
                        onSelect={() => {
                          void run("Отклоняем факт", () =>
                            backend.decideFact(d.id, f.id, "rejected"),
                          );
                        }}
                      >{translateUi("Reject")}</FlowAction>
                    </div>
                  </article>
                )),
              )}
              {!remote.documents.length && (
                <div className="dm-panel success">
                  <p>{translateUi("Используем описание и настройки профиля.")}</p>
                </div>
              )}
            </div>
            <aside className="dm-panel dark">
              <p className="dm-label">{translateUi("YOUR CONTEXT / SOURCE")}</p>
              <h3>{translateUi(draft.self_description)}</h3>
              <p>
                {remote.documents.reduce(
                  (n, d) =>
                    n + d.facts.filter((f) => f.status === "confirmed").length,
                  0,
                )}{translateUi(" ")}{translateUi("подтверждённых фактов")}</p>
              <GestureTarget id="context-documents-back" onSelect={() => setStep("documents")}>{translateUi("Источники и удаление")}</GestureTarget>
            </aside>
          </div>
          {remote.aiProfile && (
            <AIProfileSummary profile={remote.aiProfile.profile} />
          )}
          <div className="dm-actions">
            <FlowAction id="review-build" disabled={!!busy} onSelect={generate}>{translateUi("Создать personalized plan →")}</FlowAction>
            <GestureTarget id="context-summary"
              disabled={!!busy}
              onSelect={() => {
                void run("Что тренер учёл", () => backend.generateAIProfile());
              }}
            >{translateUi("Посмотреть summary")}</GestureTarget>
            <GestureTarget id="context-edit" onSelect={() => setStep("intake")}>{translateUi("Изменить описание")}</GestureTarget>
          </div>
        </>
      )}
      {deleteId && (
        <div
          className="dm-status error"
          role="alertdialog"
          aria-label={translateUi("Удалить источник")}
          data-figma-node="3:148"
        >
          <h3>{translateUi("Удалить источник и его факты?")}</h3>
          <p>{translateUi("Профиль и активный AI plan будут пересозданы без этого источника.")}</p>
          <div className="dm-actions">
            <button
              disabled={!!busy}
              onClick={() => {
                void run("Удаляем источник", async () => {
                  await backend.deleteDocument(deleteId);
                  setDeleteId(null);
                  setDeleted(true);
                });
              }}
            >{translateUi("Удалить")}</button>
            <button onClick={() => setDeleteId(null)}>{translateUi("Отмена")}</button>
          </div>
        </div>
      )}
      {deleted && (
        <div className="dm-status" role="status" data-figma-node="3:149">
          <h3>{translateUi("Источник удалён")}</h3>
          <p>{translateUi("Продолжите без него или добавьте новый документ.")}</p>
          <button onClick={() => setDeleted(false)}>{translateUi("Продолжить")}</button>
        </div>
      )}
    </section>
  );
}

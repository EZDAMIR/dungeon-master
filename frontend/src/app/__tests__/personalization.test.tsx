import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ContextFlow } from "../../features/personalization/ContextFlow";
import { ReadyPrograms } from "../../features/personalization/ReadyPrograms";
import { PlanExperience } from "../../features/personalization/PlanExperience";
import { CameraCoachShell } from "../../features/personalization/CameraCoachShell";
import { GestureNavigationProvider } from "../../features/gesture-navigation/GestureNavigationProvider";
import { ApiError } from "../../api/client";
import { BackendStore } from "../../store/backend";
import { INITIAL_STATE } from "../modes";
import type {
  AIPlanMetadata,
  AIProfile,
  AIPlanExercise,
  DocumentSource,
} from "../../api/aiCoach";
let root: Root, host: HTMLDivElement;
const profile: AIProfile = {
  summary: "Short controlled sessions",
  fitness_level: "beginner",
  primary_goals: ["general_fitness"],
  secondary_goals: [],
  preferences: ["calm"],
  constraints: ["no_high_impact"],
  equipment: ["none"],
  schedule: { days_per_week: 2, minutes_per_session: 15 },
  coach_persona: {
    tone: "supportive",
    language: "ru",
    verbosity: "short",
    motivation_style: "positive",
  },
  plan_strategy: {
    intensity: "low",
    complexity: "simple",
    preferred_tempo: "controlled",
    rest_style: "generous",
  },
  personalization_highlights: ["No jumps"],
  persona_key: "maya",
  routine_preferences: [],
  source_highlights: [
    { label: "15 minutes", source_type: "profile", source_id: null },
  ],
};
const item: AIPlanExercise = {
  exercise_key: "calf_raise_demo",
  display_name: "Standing Calf Raise",
  description: "Synthetic",
  instruction: "Raise slowly",
  difficulty: "beginner",
  equipment_codes: ["none"],
  impact_level: "low",
  contraindication_tags: [],
  camera_angle: "side",
  sets: 2,
  target_reps: 6,
  rest_seconds: 90,
  tempo_hint: "3 seconds",
  reason: "Low impact",
  source_references: [
    { type: "document", label: "Avoid impact", source_id: "document" },
  ],
  camera_coaching_mode: "manual_only",
  camera_coaching_status: "manual_only",
  exercise_source: "synthetic",
  detail_available: true,
  swap_available: false,
};
const plan: AIPlanMetadata = {
  status: "synthetic",
  title: "Low-Impact Return",
  summary: "15 minutes with control",
  why_this_plan: ["Short sessions", "No jumps"],
  excluded_exercises: ["Jumping"],
  coach_persona: { tone: "supportive", language: "ru" },
  days: [
    { day_index: 0, title: "Control", estimated_minutes: 15, items: [item] },
  ],
  routine_blocks: [],
  ai_profile: profile,
  model: "synthetic-demo-v1",
  prompt_version: "workout-plan-v1",
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function click(label: string) {
  const button = Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === label,
  );
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}
function render(child: React.ReactNode) {
  act(() =>
    root.render(
      <GestureNavigationProvider
        state={{ ...INITIAL_STATE, mode: "PROFILE" }}
        onEvent={() => INITIAL_STATE}
      >
        {child}
      </GestureNavigationProvider>,
    ),
  );
}
it("keeps jury personas out of normal navigation and loads three named profiles", async () => {
  const backend = new BackendStore(),
    load = vi.spyOn(backend, "loadPersona").mockResolvedValue();
  render(
    <ContextFlow
      backend={backend}
      remote={backend.getSnapshot()}
      jury
      onPlan={() => {}}
      onBack={() => {}}
    />,
  );
  expect(host.textContent).toContain("MAYA");
  expect(host.textContent).toContain("ARMAN");
  expect(host.textContent).toContain("DANA");
  await click("Выбрать MAYA");
  expect(load).toHaveBeenCalledWith("maya");
  expect(host.textContent).toContain("Расскажи о себе");
  render(
    <ContextFlow
      backend={backend}
      remote={backend.getSnapshot()}
      jury={false}
      onPlan={() => {}}
      onBack={() => {}}
    />,
  );
  expect(host.textContent).not.toContain("Сменить профиль");
});
it.each(['maya', 'arman', 'dana'] as const)('opens the existing %s program without questionnaire steps or duplicate requests', async key => {
  const backend = new BackendStore(), onPlan = vi.fn(), onPersonalize = vi.fn();
  const load = vi.spyOn(backend, 'loadPersona').mockResolvedValue();
  let finish!: (value: never) => void;
  const generate = vi.spyOn(backend, 'generatePersonalized').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<ReadyPrograms backend={backend} onPlan={onPlan} onPersonalize={onPersonalize} />);
  const button = host.querySelector<HTMLButtonElement>(`[data-gesture-target="ready-persona-${key}"]`)!;
  await act(async () => { button.click(); button.click(); });
  expect(load).toHaveBeenCalledOnce(); expect(load).toHaveBeenCalledWith(key); expect(generate).toHaveBeenCalledOnce();
  expect(onPlan).not.toHaveBeenCalled(); expect(onPersonalize).not.toHaveBeenCalled();
  expect(host.querySelector('textarea')).toBeNull();
  await act(async () => finish(null as never));
  expect(onPlan).toHaveBeenCalledOnce(); expect(host.querySelector('[data-gesture-target="ready-program-change"]')).not.toBeNull();
  await act(async () => host.querySelector<HTMLButtonElement>('[data-gesture-target="ready-program-change"]')!.click());
  expect(host.querySelectorAll('.persona-card')).toHaveLength(3);
});
it('retries program generation for the selected coach without replacing the guest again', async () => {
  const backend = new BackendStore(), onPlan = vi.fn();
  const load = vi.spyOn(backend, 'loadPersona').mockResolvedValue();
  const generate = vi.spyOn(backend, 'generatePersonalized').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null as never);
  render(<ReadyPrograms backend={backend} onPlan={onPlan} onPersonalize={() => {}} />);
  const button = host.querySelector<HTMLButtonElement>('[data-gesture-target="ready-persona-maya"]')!;
  await act(async () => button.click());
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Не удалось открыть программу');
  expect(onPlan).not.toHaveBeenCalled();
  await act(async () => button.click());
  expect(load).toHaveBeenCalledOnce(); expect(generate).toHaveBeenCalledTimes(2); expect(onPlan).toHaveBeenCalledOnce();
});
it('explains when the server blocks demo program generation', async () => {
  const backend = new BackendStore(), onPlan = vi.fn();
  vi.spyOn(backend, 'loadPersona').mockResolvedValue();
  vi.spyOn(backend, 'generatePersonalized').mockRejectedValue(new ApiError('http', 403));
  render(<ReadyPrograms backend={backend} onPlan={onPlan} onPersonalize={() => {}} />);
  await act(async () => host.querySelector<HTMLButtonElement>('[data-gesture-target="ready-persona-maya"]')!.click());
  expect(host.querySelector('[role=alert]')?.textContent).toContain('ENABLE_FIXTURE_MODE');
  expect(host.querySelector('[role=alert]')?.textContent).not.toContain('ENABLE_DEMO_PERSONAS');
  expect(onPlan).not.toHaveBeenCalled();
});
it('does not generate or navigate after leaving the coach picker during a pending load', async () => {
  const backend = new BackendStore(), onPlan = vi.fn(); let finish!: () => void;
  vi.spyOn(backend, 'loadPersona').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const generate = vi.spyOn(backend, 'generatePersonalized').mockResolvedValue(null as never);
  const cancel = vi.spyOn(backend, 'cancelGeneration').mockResolvedValue();
  render(<ReadyPrograms backend={backend} onPlan={onPlan} onPersonalize={() => {}} />);
  await act(async () => host.querySelector<HTMLButtonElement>('[data-gesture-target="ready-persona-dana"]')!.click());
  render(<p>Other screen</p>);
  await act(async () => finish());
  expect(cancel).toHaveBeenCalledOnce(); expect(generate).not.toHaveBeenCalled(); expect(onPlan).not.toHaveBeenCalled();
});
it("uploads a document and reviews individual confirmed/rejected facts without raw text", async () => {
  const backend = new BackendStore(),
    upload = vi.spyOn(backend, "uploadDocument").mockResolvedValue(),
    save = vi.spyOn(backend, "saveContext").mockResolvedValue(),
    decide = vi.spyOn(backend, "decideFact").mockResolvedValue();
  const doc: DocumentSource = {
    id: "document",
    filename: "synthetic.txt",
    media_type: "text/plain",
    size_bytes: 20,
    extracted_character_count: 20,
    status: "processed",
    message: null,
    created_at: "2026-09-30",
    facts: [
      {
        id: "fact",
        document_id: "document",
        normalized_fact: "Avoid high impact",
        source_excerpt: "No jumps",
        constraint_code: "no_high_impact",
        status: "pending",
      },
    ],
  };
  const remote = {
    ...backend.getSnapshot(),
    context: {
      self_description: "Synthetic Maya",
      preferred_coach_style: "supportive" as const,
      preferred_language: "ru" as const,
      additional_preferences: {},
    },
    documents: [doc],
  };
  render(
    <ContextFlow
      backend={backend}
      remote={remote}
      jury={false}
      onPlan={() => {}}
      onBack={() => {}}
    />,
  );
  await click("Продолжить →");
  expect(save).toHaveBeenCalled();
  const input = host.querySelector("input[type=file]")!;
  const file = new File(["No jumps"], "synthetic.txt", { type: "text/plain" });
  Object.defineProperty(input, "files", { value: [file] });
  await act(async () =>
    input.dispatchEvent(new Event("change", { bubbles: true })),
  );
  expect(upload).toHaveBeenCalledWith(file);
  await click("Открыть извлечённые факты");
  expect(host.textContent).toContain("Avoid high impact");
  expect(host.textContent).toContain("No jumps");
  await click("Подтвердить");
  expect(decide).toHaveBeenCalledWith("document", "fact", "confirmed");
  await click("Отклонить");
  expect(decide).toHaveBeenCalledWith("document", "fact", "rejected");
});
it("shows reasons and source chips, honestly unavailable swap and manual details", async () => {
  const backend = new BackendStore(),
    start = vi.fn();
  render(
    <PlanExperience
      plan={plan}
      planId="plan"
      backend={backend}
      onStart={start}
      onContext={() => {}}
    />,
  );
  expect(host.textContent).toContain("2 × 6");
  expect(host.textContent).toContain("Из документа: Избегать ударной нагрузки");
  await click("Почему этот план подходит именно вам");
  expect(host.textContent).toContain("Что тренер учёл");
  expect(host.textContent).toContain("Jumping");
  await click("Инструкции и камера →");
  expect(host.querySelector("dialog")?.open).toBe(true);
  expect(host.textContent).toContain(
    "Для этого упражнения пока доступно ручное выполнение",
  );
  await click("Начать Вручную →");
  expect(start).toHaveBeenCalledWith(
    expect.objectContaining({ spec: null, language: "ru" }),
  );
  expect(host.querySelector("button[disabled]")?.textContent).toContain(
    "Замена недоступна",
  );
});
it("renders separate tracking, repetitions and one correction without a debug panel", () => {
  render(
    <CameraCoachShell
      exercise={{ item, spec: null, planId: null, language: "kk" }}
      view={{
        stage: "returning",
        label: "Қайту",
        primary: "Баяуырақ",
        secondary: "Control",
        tracking: true,
        reps: 2,
        target: 6,
        side: "left",
        correction: true,
      }}
      stage="WORKOUT"
      countdown={0}
      onPause={() => {}}
      onResume={() => {}}
      onFinish={() => {}}
      voice="Speech unavailable · visual only"
      onVoice={() => {}}
    />,
  );
  expect(host.querySelectorAll(".distance-cue:not(.cue-measure)")).toHaveLength(
    1,
  );
  expect(host.textContent).toContain("РУЧНОЙ ТАЙМЕР");
  expect(host.textContent).toContain("visual only");
  expect(host.textContent).not.toContain("meanVisibility");
});

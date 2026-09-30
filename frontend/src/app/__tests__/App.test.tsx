import { BackendStore } from "../../store/backend";
import { ApiClient } from "../../api/client";
import { SafeStorage } from "../../store/persistence";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { App } from "../App";
let root: Root, container: HTMLDivElement, time: number, backend: BackendStore;
beforeEach(() => {
  backend = new BackendStore(
    new ApiClient(
      "http://test",
      50,
      vi.fn().mockRejectedValue(new Error("offline")),
    ),
    new SafeStorage(),
  );
  vi.spyOn(backend, "attach").mockReturnValue(() => {});
  vi.spyOn(backend, "retry").mockResolvedValue();
  time = 0;
  vi.spyOn(performance, "now").mockImplementation(() => time);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 100,
    right: 300,
    bottom: 300,
    width: 200,
    height: 200,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  window.history.replaceState({}, "", "/?fakeVision=1");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
function click(label: string, at: number) {
  time = at;
  const button = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === label,
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  act(() => button.click());
}
it("drives the rendered application through the shared fake semantic pipeline", () => {
  act(() => root.render(<App backend={backend} />));
  expect(container.querySelector("header code")?.textContent).toBe(
    "CAMERA_PERMISSION",
  );
  click("Camera ready", 0);
  click("Hand found", 10);
  click("Move cursor to target", 400);
  expect(container.textContent).toContain("Шаг 2/5");
  click("Move cursor to target", 450);
  expect(container.textContent).toContain("Шаг 3/5");
  click("Pinch / select", 500);
  expect(container.textContent).toContain("Шаг 4/5");
  click("Fist hold", 1200);
  expect(container.textContent).toContain("Шаг 5/5");
  click("Thumb Up hold", 2000);
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
  click("Thumb Up hold", 2100);
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
  expect(container.textContent).toContain("Сначала выбери тренировку щипком");
  click("Move cursor to target", 2200);
  click("Pinch / select", 2300);
  expect(
    container
      .querySelector('[data-gesture-target="bodyweight-squat"]')
      ?.getAttribute("aria-pressed"),
  ).toBe("true");
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
  click("Thumb Up hold", 3000);
  expect(container.querySelector("header code")?.textContent).toBe(
    "CALIBRATION",
  );
  click("Fist hold", 4000);
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
  click("Fist hold", 5000);
  expect(container.querySelector("header code")?.textContent).toBe("TUTORIAL");
  click("Move cursor to target", 5400);
  expect(container.textContent).toContain("Шаг 2/5");
  click("Camera error", 6000);
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Камера отключена",
  );
  click("Повторить / Retry", 6100);
  expect(container.querySelector("header code")?.textContent).toBe("TUTORIAL");
});
it("hides fake controls by default and does not request camera before the start action", () => {
  window.history.replaceState({}, "", "/");
  const getUserMedia = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  act(() => root.render(<App backend={backend} />));
  expect(container.textContent).not.toContain("Fake vision");
  expect(container.textContent).toContain("Tell us about you");
  expect(getUserMedia).not.toHaveBeenCalled();
});
it("renders a five-cycle pose workout, pause recovery, specific corrections and results", () => {
  act(() => root.render(<App backend={backend} />));
  click("Camera ready", 0);
  click("Продолжить без проверки жестов", 500);
  click("Bodyweight SquatДемонстрационный подход · 5 повторений", 1000);
  click("Подтвердить выбор", 1500);
  click("Wrong camera angle", 2000);
  expect(container.textContent).toContain("Повернись боком к камере");
  click("Stable calibration / countdown", 7000);
  expect(container.querySelector("header code")?.textContent).toBe("COUNTDOWN");
  click("Pose tracking lost", 12000);
  expect(container.querySelector("header code")?.textContent).toBe(
    "CALIBRATION",
  );
  click("Stable calibration / countdown", 15000);
  click("Stable calibration / countdown", 20000);
  expect(container.querySelector("header code")?.textContent).toBe("WORKOUT");
  click("Correct rep", 26000);
  expect(container.textContent).toContain("1 / 5");
  click("Pose pause / resume", 34000);
  expect(container.textContent).toContain("Тренировка на паузе");
  click("Pose pause / resume", 40000);
  expect(container.querySelector("header code")?.textContent).toBe("WORKOUT");
  click("Shallow rep", 46000);
  expect(container.textContent).toContain("Опустись немного ниже");
  click("Fast rep", 54000);
  expect(container.textContent).toContain("Медленнее вниз");
  click("Incomplete extension", 62000);
  expect(container.textContent).toContain("Заверши подъём");
  click("Correct rep", 70000);
  expect(container.querySelector("header code")?.textContent).toBe("RESULTS");
  expect(container.textContent).toContain("Подход завершён");
  expect(container.textContent).toContain("40%");
  expect(container.textContent).toContain("Среднее время повторения");
  click("Повторить подход", 78000);
  expect(container.querySelector("header code")?.textContent).toBe(
    "CALIBRATION",
  );
  click("Назад в меню", 79000);
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
});
it("keeps calibration, squat and immediate Results usable when every backend request fails", async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error("offline"));
  backend = new BackendStore(
    new ApiClient("http://test", 50, transport),
    new SafeStorage(),
  );
  await act(async () => root.render(<App backend={backend} />));
  expect(container.textContent).toContain("Локальный режим");
  click("Camera ready", 0);
  click("Продолжить без проверки жестов", 500);
  click("Bodyweight SquatДемонстрационный подход · 5 повторений", 1000);
  click("Подтвердить выбор", 1500);
  click("Stable calibration / countdown", 7000);
  click("Stable calibration / countdown", 14000);
  for (let i = 0; i < 5; i++) click("Correct rep", 20000 + i * 7000);
  expect(container.querySelector("header code")?.textContent).toBe("RESULTS");
  expect(container.textContent).toContain("Подход завершён");
  await act(async () => {
    await backend.retry();
  });
  expect(container.querySelector("header code")?.textContent).toBe("RESULTS");
  expect(container.textContent).toContain("Ожидает синхронизации");
  expect(backend.queue.entries()).toHaveLength(1);
  expect(transport).toHaveBeenCalledTimes(2);
});
it("boots an online guest, starts the planned squat, shows Results before sync and refreshes Progress", async () => {
  const user = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: null,
    display_name: null,
    is_guest: true,
    created_at: "2026-09-30T00:00:00Z",
  };
  const profile = {
    goal: "general_fitness",
    experience_level: "beginner",
    days_per_week: 3,
    session_minutes: 20,
    equipment: ["none"],
    locale: "ru-RU",
    timezone: "Asia/Almaty",
    confirmed_constraints: [],
  };
  const exercise = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    key: "bodyweight_squat",
    name: "Bodyweight Squat",
    difficulty: "beginner",
    equipment_codes: ["none"],
    impact_level: "low",
    camera_angle: "side",
    contraindication_tags: ["avoid_deep_knee_flexion"],
    analysis_profile: {
      version: 1,
      engine_key: "bodyweight_squat_side_v1",
      engine_version: "squat-v1",
      target_reps: 5,
      supported_client: "web",
    },
  };
  const plan = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    status: "active",
    source: "deterministic",
    starts_on: "2026-09-28",
    rationale: "Controlled practice",
    generator_version: "deterministic-v1",
    created_at: user.created_at,
    updated_at: user.created_at,
    items: [
      {
        id: "item",
        exercise_id: exercise.id,
        exercise,
        day_index: 2,
        position: 0,
        sets: 1,
        target_reps: 5,
        rest_seconds: 60,
        tempo_hint: "controlled",
        scheduled_at: null,
      },
    ],
  };
  let progress = {
    completed_sessions: 0,
    total_reps: 0,
    accepted_reps: 0,
    rejected_reps: 0,
    acceptance_rate: 0,
    error_counts: {
      depth_insufficient: 0,
      too_fast: 0,
      incomplete_extension: 0,
    },
    recent_sessions: [],
  };
  let releaseStart: ((value: Response) => void) | undefined;
  const reply = (value: unknown) =>
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    });
  const transport = vi.fn<typeof fetch>(async (url, options) => {
    const path = String(url).replace("http://test", "");
    if (path === "/auth/guest")
      return reply({ access_token: "synthetic-guest", expires_in: 3600, user });
    if (path === "/profile") return reply(profile);
    if (path === "/exercises") return reply([exercise]);
    if (
      path === "/training-plans/current" ||
      path === "/training-plans/generate"
    )
      return reply(plan);
    if (path.startsWith("/progress/summary")) return reply(progress);
    if (path === "/workout-sessions")
      return new Promise((resolve) => {
        releaseStart = resolve;
      });
    if (path.endsWith("/sets")) return reply({ id: "set" });
    if (path.endsWith("/complete")) {
      const summary = JSON.parse(String(options?.body)).summary;
      progress = {
        ...progress,
        ...summary,
        completed_sessions: 1,
        acceptance_rate: 1,
      };
      return reply({ id: "session", status: "completed" });
    }
    throw new Error("Unexpected route");
  });
  backend = new BackendStore(
    new ApiClient("http://test", 1000, transport),
    new SafeStorage(),
  );
  await act(async () => root.render(<App backend={backend} />));
  click("Camera ready", 0);
  click("Продолжить без проверки жестов", 500);
  click("Профиль", 600);
  expect(container.querySelector("header code")?.textContent).toBe("PROFILE");
  click("Fist hold", 1000);
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
  click(
    "Сегодня · Базовый планBodyweight Squat · 1 × 5 · Контролируемый темп",
    1100,
  );
  expect(container.querySelector("header code")?.textContent).toBe("PLAN");
  await act(async () => click("Создать новый план", 1200));
  click("Изменить профиль", 1300);
  click("Назад в меню", 1400);
  click(
    "Bodyweight SquatПо базовому плану · 1 × 5 · Контролируемый темп",
    1500,
  );
  click("Подтвердить выбор", 2000);
  click("Stable calibration / countdown", 8000);
  click("Stable calibration / countdown", 15000);
  for (let i = 0; i < 5; i++) click("Correct rep", 22000 + i * 7000);
  expect(container.querySelector("header code")?.textContent).toBe("RESULTS");
  expect(container.textContent).toContain("Подход завершён");
  const request = transport.mock.calls.find(([url]) =>
    String(url).endsWith("/workout-sessions"),
  )!;
  expect(JSON.parse(String(request[1]?.body)).plan_id).toBe(plan.id);
  expect(releaseStart).toBeDefined();
  await act(async () => {
    releaseStart!(reply({ id: "session" }));
    await backend.retry();
  });
  expect(container.textContent).toContain("Сохранено");
  expect(backend.queue.entries()).toHaveLength(0);
  click("Вернуться в меню", 70000);
  click("Прогресс", 71000);
  expect(container.querySelector("header code")?.textContent).toBe("PROGRESS");
  expect(container.textContent).toContain("100%");
  click("Назад в меню", 72000);
  expect(container.querySelector("header code")?.textContent).toBe("MENU");
  const network = transport.mock.calls
    .filter(([, options]) => options?.method === "POST")
    .map(([, options]) => String(options?.body))
    .join("");
  expect(network).not.toMatch(
    /landmarks|frames|video|image|screenshot|user_id/,
  );
});

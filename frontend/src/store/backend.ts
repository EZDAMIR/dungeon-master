import type { GenerationJob } from "../api/release";
import type {
  AIContext,
  AIProfileResponse,
  DocumentSource,
  ExerciseSpec,
  Fact,
  PersonaKey,
} from "../api/aiCoach";
import { ApiClient, ApiError } from "../api/client";
import { createGuest, getMe, refreshGuest } from "../api/auth";
import { getExercises } from "../api/exercises";
import { getProfile, putProfile } from "../api/profile";
import { generatePlan, getCurrentPlan } from "../api/plans";
import { createSession, createSet, completeSession } from "../api/sessions";
import { getProgress } from "../api/progress";
import type {
  AuthState,
  BackendStatus,
  ProfileUpdate,
  Progress,
  SessionCreate,
  TrainingPlan,
} from "../api/types";
import type { WorkoutResult } from "../types/vision";
import {
  AUTH_KEY,
  PROFILE_KEY,
  PROGRESS_KEY,
  PendingQueue,
  SafeStorage,
  browserStorage,
  profileFields,
  readAuth,
  readProfile,
  readProgress,
  record,
  type PendingEntry,
} from "./persistence";
export type BackendSnapshot = {
  generationJob: GenerationJob | null;
  context: AIContext | null;
  documents: DocumentSource[];
  aiProfile: AIProfileResponse | null;
  status: BackendStatus;
  auth: AuthState | null;
  profile: ProfileUpdate;
  plan: TrainingPlan | null;
  planMessage: string | null;
  progress: Progress | null;
  cachedProgress: boolean;
  pendingCount: number;
  syncMessage: string;
  profileMessage: string;
  lastSavedClientId: string | null;
  storageAvailable: boolean;
};
export function defaultProfile(): ProfileUpdate {
  const locale = navigator.language || "ru-RU";
  return {
    goal: "general_fitness",
    experience_level: "beginner",
    days_per_week: 3,
    session_minutes: 20,
    equipment: ["none"],
    locale:
      /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(locale) &&
      locale.length <= 35
        ? locale
        : "ru-RU",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Almaty",
    confirmed_constraints: [],
  };
}
export class BackendStore {
  private state: BackendSnapshot;
  private listeners = new Set<() => void>();
  private refreshFlight: Promise<string> | null = null;
  private bootstrapFlight: Promise<void> | null = null;
  private syncFlight: Promise<void> | null = null;
  private controller = new AbortController();
  private clients = 0;
  private authVerified = false;
  readonly queue: PendingQueue;
  private readonly client: ApiClient;
  private readonly storage: SafeStorage;
  constructor(
    client = new ApiClient(),
    storage: SafeStorage = browserStorage(),
  ) {
    this.client = client;
    this.client.setAuthRecovery(() => this.refreshAuth());
    this.storage = storage;
    this.queue = new PendingQueue(storage);
    const auth = readAuth(storage),
      cache = auth ? readProgress(storage, auth.user.id) : null;
    const draft = storage.read(PROFILE_KEY);
    const profile =
      record(draft) &&
      (draft.ownerId === null || draft.ownerId === auth?.user.id)
        ? readProfile(draft.profile)
        : null;
    this.state = {
      generationJob: null,
      context: null,
      documents: [],
      aiProfile: null,
      status: "connecting",
      auth,
      profile: profile ?? defaultProfile(),
      plan: null,
      planMessage: null,
      progress: cache,
      cachedProgress: cache !== null,
      pendingCount: this.queue.entries().length,
      syncMessage: "",
      profileMessage: "",
      lastSavedClientId: null,
      storageAvailable: storage.persistent,
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<BackendSnapshot>) {
    this.state = {
      ...this.state,
      ...patch,
      storageAvailable: this.storage.persistent,
    };
    for (const listener of this.listeners) listener();
  }
  attach = () => {
    this.clients++;
    if (this.clients === 1) {
      window.addEventListener("online", this.online);
      if (this.controller.signal.aborted)
        this.controller = new AbortController();
      void this.bootstrap();
    }
    return () => {
      this.clients--;
      queueMicrotask(() => {
        if (this.clients === 0) {
          window.removeEventListener("online", this.online);
          this.controller.abort();
        }
      });
    };
  };
  private online = () => {
    void this.retry();
  };
  private degraded(error: unknown) {
    if (error instanceof ApiError && error.kind === "aborted") return;
    this.publish({
      status:
        error instanceof ApiError &&
        (error.kind === "offline" || error.kind === "timeout")
          ? "offline"
          : "error",
      cachedProgress: this.state.progress !== null,
      pendingCount: this.queue.entries().length,
    });
  }
  bootstrap(sync = true): Promise<void> {
    if (this.bootstrapFlight) return this.bootstrapFlight;
    if (this.controller.signal.aborted) this.controller = new AbortController();
    this.bootstrapFlight = this.initialize(sync).finally(() => {
      this.bootstrapFlight = null;
    });
    return this.bootstrapFlight;
  }
  private async initialize(sync: boolean) {
    this.publish({ status: "connecting" });
    try {
      let auth = this.state.auth ?? readAuth(this.storage);
      if (auth) {
        auth = { ...auth, user: await getMe(this.client, auth.accessToken, this.controller.signal) };
        // ApiClient may have refreshed while verifying. Preserve its renewed access token.
        if (this.state.auth?.user.id === auth.user.id) auth = { ...auth, accessToken: this.state.auth.accessToken, expiresAt: this.state.auth.expiresAt };
      }
      if (!auth) {
        const response = await createGuest(this.client, this.controller.signal);
        auth = {
          accessToken: response.access_token,
          user: response.user,
          expiresAt: Date.now() + response.expires_in * 1000,
        };
      }
      const changed = this.state.auth?.user.id !== auth.user.id;
      this.storage.write(AUTH_KEY, auth);
      this.authVerified = true;
      this.publish({
        auth,
        ...(changed
          ? {
              context: null,
              documents: [],
              aiProfile: null,
              progress: readProgress(this.storage, auth.user.id),
              plan: null,
              profile: defaultProfile(),
              cachedProgress: false,
            }
          : {}),
      });
      const draft = this.storage.read(PROFILE_KEY);
      const local =
        record(draft) &&
        (draft.ownerId === null || draft.ownerId === auth.user.id)
          ? readProfile(draft.profile)
          : null;
      let profile: ProfileUpdate;
      let createdProfile = false;
      try {
        profile = await getProfile(
          this.client,
          auth.accessToken,
          this.controller.signal,
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          profile = await putProfile(
            this.client,
            auth.accessToken,
            local ?? defaultProfile(),
            this.controller.signal,
          );
          createdProfile = true;
        } else throw error;
      }
      if (local && record(draft) && draft.dirty === true && !createdProfile)
        profile = await putProfile(
          this.client,
          auth.accessToken,
          local,
          this.controller.signal,
        );
      this.storage.write(PROFILE_KEY, {
        ownerId: auth.user.id,
        profile: profileFields(profile),
        dirty: false,
      });
      this.publish({
        profile: profileFields(profile),
        profileMessage: "Профиль сохранён",
      });
      const eligible = await getExercises(
        this.client,
        auth.accessToken,
        this.controller.signal,
      );
      try {
        const plan = await getCurrentPlan(
          this.client,
          auth.accessToken,
          this.controller.signal,
        );
        if (
          (local && record(draft) && draft.dirty === true) ||
          (plan.source === "deterministic" &&
            plan.items.some(
              (item) =>
                !eligible.some((exercise) => exercise.id === item.exercise_id),
            ))
        )
          await this.generate();
        else this.publish({ plan, planMessage: null });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404)
          await this.generate();
        else throw error;
      }
      await this.refreshProgress();
      this.publish({ status: "online" });
      if (sync) await this.flushPending(false);
    } catch (error) {
      this.degraded(error);
    }
  }
  async saveProfile(profile: ProfileUpdate): Promise<void> {
    const body = profileFields(profile),
      auth = this.state.auth;
    this.storage.write(PROFILE_KEY, {
      ownerId: auth?.user.id ?? null,
      profile: body,
      dirty: true,
    });
    this.publish({
      profile: body,
      plan: null,
      profileMessage:
        "Локальный черновик сохранён. Синхронизация с сервером недоступна.",
    });
    if (
      !auth ||
      !this.authVerified ||
      this.state.status === "offline" ||
      this.state.status === "error"
    )
      return;
    try {
      const saved = await putProfile(
        this.client,
        auth.accessToken,
        body,
        this.controller.signal,
      );
      this.storage.write(PROFILE_KEY, {
        ownerId: auth.user.id,
        profile: profileFields(saved),
        dirty: false,
      });
      this.publish({
        profile: profileFields(saved),
        profileMessage: "Профиль сохранён",
      });
      await this.generate();
    } catch (error) {
      this.degraded(error);
    }
  }
  async generate(): Promise<void> {
    const auth = this.state.auth;
    if (!auth || !this.authVerified) {
      this.publish({
        planMessage: "План доступен после подключения к серверу",
      });
      return;
    }
    try {
      this.publish({
        plan: await generatePlan(
          this.client,
          auth.accessToken,
          this.controller.signal,
        ),
        planMessage: null,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "no_eligible_exercises") {
        this.publish({
          plan: null,
          planMessage:
            "Для выбранного профиля нет доступных поддерживаемых упражнений. Измени профиль или ограничения. Демонстрационный присед остаётся отдельным локальным действием.",
        });
      } else {
        this.degraded(error);
        this.publish({
          planMessage: "Не удалось обновить план. Повтори после подключения.",
        });
      }
    }
  }
  refreshAuth(): Promise<string> {
    if (this.refreshFlight) return this.refreshFlight;
    const owner = this.state.auth?.user.id;
    this.refreshFlight = refreshGuest(this.client, this.controller.signal).then(response => {
      if (owner && response.user.id !== owner) throw new ApiError("protocol");
      const auth = { accessToken: response.access_token, user: response.user,
        expiresAt: Date.now() + response.expires_in * 1000 };
      this.storage.write(AUTH_KEY, auth);
      this.authVerified = true;
      this.publish({ auth });
      return auth.accessToken;
    }).finally(() => { this.refreshFlight = null; });
    return this.refreshFlight;
  }
  async request<T>(path: string, body?: unknown, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", signal?: AbortSignal) {
    return this.client.json<T>(path, { ...this.authenticated(), method, body, signal: signal ?? this.controller.signal });
  }
  async requestBlob(path: string, body?: unknown, method: "GET" | "POST" = "GET", signal?: AbortSignal) {
    return this.client.blob(path, { ...this.authenticated(), method, body, signal: signal ?? this.controller.signal, timeoutMs: 30000 });
  }
  private authenticated() {
    const auth = this.state.auth;
    if (!auth || !this.authVerified) throw new ApiError("offline");
    return { token: auth.accessToken, signal: this.controller.signal };
  }
  async loadContext(): Promise<void> {
    const options = this.authenticated(),
      owner = this.state.auth!.user.id;
    const [context, documents, aiProfile] = await Promise.all([
      this.client.json<AIContext>("/ai-context", options).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
      this.client.json<DocumentSource[]>("/documents", options),
      this.client.json<AIProfileResponse>("/ai-profile/current", options).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; }),
    ]);
    if (this.state.auth?.user.id === owner)
      this.publish({ context, documents, aiProfile });
  }
  async saveContext(context: AIContext) {
    const saved = await this.client.json<AIContext>("/ai-context", {
      ...this.authenticated(),
      method: "PUT",
      body: {
        self_description: context.self_description,
        preferred_coach_style: context.preferred_coach_style,
        preferred_language: context.preferred_language,
        additional_preferences: context.additional_preferences,
      },
    });
    this.publish({ context: saved, aiProfile: null, plan: null });
  }
  async loadPersona(key: PersonaKey) {
    await this.bootstrapFlight;
    await this.syncFlight;
    const response = await createGuest(this.client, this.controller.signal);
    const auth = {
      accessToken: response.access_token,
      user: response.user,
      expiresAt: Date.now() + response.expires_in * 1000,
    };
    this.authVerified = true;
    this.storage.write(AUTH_KEY, auth);
    this.publish({
      auth,
      context: null,
      documents: [],
      aiProfile: null,
      plan: null,
      progress: null,
      cachedProgress: false,
      status: "online",
    });
    const demo = await this.client.json<{
      context: AIContext;
      documents: DocumentSource[];
    }>("/demo-personas/" + key + "/load", {
      ...this.authenticated(),
      method: "POST",
    });
    const profile = await getProfile(
      this.client,
      auth.accessToken,
      this.controller.signal,
    );
    this.storage.write(PROFILE_KEY, {
      ownerId: auth.user.id,
      profile: profileFields(profile),
      dirty: false,
    });
    this.publish({
      context: demo.context,
      documents: demo.documents,
      profile: profileFields(profile),
    });
  }
  async uploadDocument(file: File) {
    const form = new FormData();
    form.append("file", file);
    const document = await this.client.json<DocumentSource>("/documents", {
      ...this.authenticated(),
      method: "POST",
      body: form,
      timeoutMs: 35000,
    });
    this.publish({ documents: [...this.state.documents, document] });
  }
  async decideFact(
    documentId: string,
    factId: string,
    status: "confirmed" | "rejected",
  ) {
    const fact = await this.client.json<Fact>(
      `/documents/${documentId}/facts/${factId}`,
      { ...this.authenticated(), method: "PUT", body: { status } },
    );
    this.publish({
      aiProfile: null,
      plan: null,
      documents: this.state.documents.map((d) =>
        d.id === documentId
          ? { ...d, facts: d.facts.map((f) => (f.id === factId ? fact : f)) }
          : d,
      ),
    });
  }
  async deleteDocument(id: string) {
    await this.client.request("/documents/" + id, {
      ...this.authenticated(),
      method: "DELETE",
    });
    this.publish({
      documents: this.state.documents.filter((d) => d.id !== id),
      aiProfile: null,
      plan: null,
    });
  }
  async generateAIProfile() {
    const profile = await this.client.json<AIProfileResponse>(
      "/ai-profile/generate",
      { ...this.authenticated(), method: "POST", timeoutMs: 95000 },
    );
    this.publish({ aiProfile: profile });
    return profile;
  }
  private generationController: AbortController | null = null;
  async cancelGeneration() {
    const job = this.state.generationJob;
    this.generationController?.abort();
    if (job && ["queued", "running"].includes(job.status)) {
      const stopped = await this.request<GenerationJob>(`/generation-jobs/${job.id}/cancel`, { operation_id: crypto.randomUUID() }, "POST");
      this.publish({ generationJob: stopped });
    }
  }
  async generatePersonalized() {
    if (this.generationController && !this.generationController.signal.aborted) throw new ApiError("http", 409);
    const controller = new AbortController(); this.generationController = controller;
    const abort = () => controller.abort(); this.controller.signal.addEventListener("abort", abort, { once: true });
    try {
      let job = await this.request<GenerationJob>("/generation-jobs", { operation_id: crypto.randomUUID(), execution_mode: "live" }, "POST", controller.signal);
      this.publish({ generationJob: job });
      const deadline = Date.now() + 190000;
      while (["queued", "running"].includes(job.status)) {
        if (Date.now() >= deadline) throw new ApiError("timeout");
        await new Promise<void>((resolve, reject) => {
          const cancelled = () => { clearTimeout(timer); reject(new ApiError("aborted")); };
          const timer = setTimeout(() => { controller.signal.removeEventListener("abort", cancelled); resolve(); }, 1000);
          if (controller.signal.aborted) cancelled(); else controller.signal.addEventListener("abort", cancelled, { once: true });
        });
        job = await this.request<GenerationJob>(`/generation-jobs/${job.id}`, undefined, "GET", controller.signal);
        this.publish({ generationJob: job });
      }
      if (!["completed", "fallback"].includes(job.status)) throw new ApiError("http", 503, job.error_category);
      const plan = await this.request<TrainingPlan>("/training-plans/current", undefined, "GET", controller.signal);
      this.publish({ plan, planMessage: null }); return plan;
    } finally { this.controller.signal.removeEventListener("abort", abort); this.generationController = null; }
  }
  async exerciseSpec(key: string) {
    return this.client.json<ExerciseSpec>(
      "/exercise-specs/" + encodeURIComponent(key),
      this.authenticated(),
    );
  }
  async refreshProgress(): Promise<void> {
    const auth = this.state.auth;
    if (!auth || !this.authVerified) return;
    const progress = await getProgress(
      this.client,
      auth.accessToken,
      this.controller.signal,
    );
    this.storage.write(PROGRESS_KEY, { ownerId: auth.user.id, data: progress });
    this.publish({ progress, cachedProgress: false });
  }
  startWorkout(
    planId: string | null,
    engineVersion = "squat-v1",
  ): SessionCreate {
    return {
      client_session_id: crypto.randomUUID(),
      plan_id: planId,
      started_at: new Date().toISOString(),
      client_engine_version: engineVersion,
    };
  }
  recordWorkout(
    start: SessionCreate,
    result: WorkoutResult,
    meanMinKneeAngle: number,
  ): boolean {
    const entry: PendingEntry = {
      ownerId: this.state.auth?.user.id ?? null,
      session: start,
      set: {
        client_set_id: crypto.randomUUID(),
        exercise_key: result.exerciseKey,
        set_index: 1,
        total_reps: result.totalReps,
        accepted_reps: result.acceptedReps,
        duration_ms: Math.round(result.durationMs),
        error_counts: { ...result.errorCounts },
        ...(result.genericErrorCounts
          ? { generic_error_counts: result.genericErrorCounts }
          : {}),
        metrics: {
          mean_rep_duration_ms: result.meanRepDurationMs,
          mean_min_knee_angle: meanMinKneeAngle,
        },
        engine_version: result.engineVersion,
      },
      complete: {
        completed_at: new Date().toISOString(),
        summary: {
          total_reps: result.totalReps,
          accepted_reps: result.acceptedReps,
          rejected_reps: result.rejectedReps,
          duration_ms: Math.round(result.durationMs),
          error_counts: { ...result.errorCounts },
          ...(result.genericErrorCounts
            ? { generic_error_counts: result.genericErrorCounts }
            : {}),
        },
      },
      attempts: 0,
      lastAttemptAt: null,
    };
    const added = this.queue.add(entry);
    this.publish({
      pendingCount: this.queue.entries().length,
      syncMessage: added
        ? "Ожидает синхронизации"
        : "Результат остаётся на экране. Очередь заполнена или агрегат выходит за допустимые границы.",
      lastSavedClientId: null,
    });
    if (added) void this.retry();
    return added;
  }
  recordSets(start: SessionCreate, sets: import("../api/types").SetCreate[]): boolean {
    if (!sets.length) return false;
    const errors = { depth_insufficient: 0, too_fast: 0, incomplete_extension: 0 }, generic: Record<string, number> = {};
    for (const set of sets) {
      for (const key of Object.keys(errors) as (keyof typeof errors)[]) errors[key] += set.error_counts[key];
      for (const [key,count] of Object.entries(set.generic_error_counts ?? {})) generic[key] = (generic[key] ?? 0) + count;
    }
    const camera = sets.filter(set => set.assessment_mode !== "manual").reduce((n,set) => n + set.total_reps, 0), accepted = sets.reduce((n,set) => n + set.accepted_reps, 0);
    const entry: PendingEntry = { ownerId: this.state.auth?.user.id ?? null, session: start, set: sets[0], sets, attempts: 0, lastAttemptAt: null, complete: { completed_at: new Date().toISOString(), summary: { total_reps: sets.reduce((n,set) => n + set.total_reps, 0), accepted_reps: accepted, rejected_reps: camera - accepted, duration_ms: sets.reduce((n,set) => n + set.duration_ms, 0), error_counts: errors, generic_error_counts: generic, total_sets: sets.length, camera_total_reps: camera, manual_completed_sets: sets.filter(set => set.assessment_mode === "manual" && set.completion_status !== "partial").length } } };
    const added = this.queue.add(entry);
    this.publish({ pendingCount: this.queue.entries().length, syncMessage: added ? "Ожидает синхронизации" : "Результаты остаются на экране. Очередь заполнена или данные не прошли проверку.", lastSavedClientId: null });
    if (added) void this.retry(); return added;
  }
  async retry(): Promise<void> {
    if (this.syncFlight) return this.syncFlight;
    if (
      !this.authVerified ||
      this.state.status === "offline" ||
      this.state.status === "error"
    )
      return this.bootstrap();
    await this.flushPending(true);
  }
  private flushPending(recoverAuth: boolean): Promise<void> {
    if (this.syncFlight) return this.syncFlight;
    this.syncFlight = this.sync(recoverAuth).finally(() => {
      this.syncFlight = null;
    });
    return this.syncFlight;
  }
  private async sync(recoverAuth: boolean) {
    const auth = this.state.auth;
    if (!auth || !this.authVerified) return;
    const entries = this.queue.entries();
    for (const original of entries) {
      if (original.ownerId !== null && original.ownerId !== auth.user.id) {
        this.publish({
          syncMessage:
            "Очередь содержит результат прежнего гостя; он не будет отправлен другому пользователю.",
        });
        continue;
      }
      const entry = {
        ...original,
        ownerId: auth.user.id,
        attempts: Math.min(original.attempts + 1, 1_000_000),
        lastAttemptAt: new Date().toISOString(),
      };
      this.queue.update(entry);
      this.publish({ status: "syncing", syncMessage: "Прогресс сохраняется" });
      try {
        const session = await createSession(
          this.client,
          auth.accessToken,
          entry.session,
          this.controller.signal,
        );
        for (const set of entry.sets ?? [entry.set]) await createSet(this.client, auth.accessToken, session.id, set, this.controller.signal);
        await completeSession(
          this.client,
          auth.accessToken,
          session.id,
          entry.complete,
          this.controller.signal,
        );
        this.queue.remove(entry.session.client_session_id);
        this.publish({
          pendingCount: this.queue.entries().length,
          lastSavedClientId: entry.session.client_session_id,
          syncMessage: "Сохранено",
        });
      } catch (error) {
        this.degraded(error);
        this.publish({ syncMessage: "Ожидает синхронизации" });
        if (error instanceof ApiError && error.status === 401 && recoverAuth) {
          this.authVerified = false;
          await this.bootstrap(false);
        }
        return;
      }
    }
    try {
      await this.refreshProgress();
      this.publish({ status: "online" });
    } catch (error) {
      this.degraded(error);
    }
  }
}
export const backendStore = new BackendStore();

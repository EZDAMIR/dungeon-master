import type {
  AuthState,
  ErrorCounts,
  ProfileUpdate,
  Progress,
  SessionComplete,
  SessionCreate,
  SetCreate,
} from "../api/types";
export const AUTH_KEY = "dungeon-master.auth.v1";
export const PENDING_KEY = "dungeon-master.pending-sessions.v1";
export const PROFILE_KEY = "dungeon-master.profile-draft.v1";
export const PROGRESS_KEY = "dungeon-master.progress.v1";
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export class SafeStorage {
  private memory = new Map<string, string>();
  persistent = true;
  private storage: StorageLike | undefined;
  constructor(storage?: StorageLike) {
    this.storage = storage;
    if (!storage) this.persistent = false;
  }
  read(key: string): unknown {
    try {
      const text = this.storage?.getItem(key) ?? this.memory.get(key);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }
  write(key: string, value: unknown) {
    const text = JSON.stringify(value);
    this.memory.set(key, text);
    try {
      this.storage?.setItem(key, text);
    } catch {
      this.persistent = false;
      this.storage = undefined;
    }
  }
  remove(key: string) {
    this.memory.delete(key);
    try {
      this.storage?.removeItem(key);
    } catch {
      this.persistent = false;
      this.storage = undefined;
    }
  }
}
export function browserStorage() {
  try {
    return new SafeStorage(window.localStorage);
  } catch {
    return new SafeStorage();
  }
}
export const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const count = (value: unknown, max = 500): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= max;
const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const bounded = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 50;
export function readAuth(storage: SafeStorage): AuthState | null {
  const data = storage.read(AUTH_KEY);
  if (
    !record(data) ||
    typeof data.accessToken !== "string" ||
    !record(data.user) ||
    !uuid(data.user.id) ||
    typeof data.expiresAt !== "number" ||
    !Number.isFinite(data.expiresAt)
  )
    return null;
  const user = data.user;
  if (
    (user.email !== null && typeof user.email !== "string") ||
    (user.display_name !== null && typeof user.display_name !== "string") ||
    typeof user.is_guest !== "boolean" ||
    !timestamp(user.created_at)
  )
    return null;
  return {
    accessToken: data.accessToken,
    expiresAt: data.expiresAt,
    user: {
      id: user.id as string,
      email: user.email,
      display_name: user.display_name,
      is_guest: user.is_guest,
      created_at: user.created_at,
    },
  };
}
export function profileFields(profile: ProfileUpdate): ProfileUpdate {
  return {
    goal: profile.goal,
    experience_level: profile.experience_level,
    days_per_week: profile.days_per_week,
    session_minutes: profile.session_minutes,
    equipment: [...profile.equipment],
    locale: profile.locale,
    timezone: profile.timezone,
    confirmed_constraints: [...profile.confirmed_constraints],
  };
}
export function readProfile(value: unknown): ProfileUpdate | null {
  if (
    !record(value) ||
    !["general_fitness", "strength_foundation", "mobility"].includes(
      String(value.goal),
    ) ||
    !["beginner", "intermediate", "advanced"].includes(
      String(value.experience_level),
    ) ||
    !count(value.days_per_week, 7) ||
    value.days_per_week < 1 ||
    !count(value.session_minutes, 120) ||
    value.session_minutes < 5 ||
    typeof value.locale !== "string" ||
    !/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(value.locale) ||
    value.locale.length > 35 ||
    typeof value.timezone !== "string" ||
    value.timezone.length > 100
  )
    return null;
  const equipment = value.equipment,
    constraints = value.confirmed_constraints;
  if (
    !Array.isArray(equipment) ||
    equipment.length < 1 ||
    equipment.length > 4 ||
    equipment.some(
      (code) =>
        !["none", "chair", "resistance_band", "dumbbells"].includes(code),
    ) ||
    new Set(equipment).size !== equipment.length ||
    (equipment.includes("none") && equipment.length > 1)
  )
    return null;
  if (
    !Array.isArray(constraints) ||
    constraints.length > 3 ||
    constraints.some(
      (code) =>
        ![
          "no_high_impact",
          "avoid_deep_knee_flexion",
          "avoid_overhead",
        ].includes(code),
    ) ||
    new Set(constraints).size !== constraints.length
  )
    return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.timezone });
  } catch {
    return null;
  }
  return profileFields(value as unknown as ProfileUpdate);
}
export function errorCounts(value: unknown, max = 500): ErrorCounts | null {
  if (
    !record(value) ||
    !count(value.depth_insufficient, max) ||
    !count(value.too_fast, max) ||
    !count(value.incomplete_extension, max)
  )
    return null;
  return {
    depth_insufficient: value.depth_insufficient,
    too_fast: value.too_fast,
    incomplete_extension: value.incomplete_extension,
  };
}
export function parseGenericErrors(
  value: unknown,
): Record<string, number> | null {
  if (value === undefined) return {};
  if (
    !record(value) ||
    Object.keys(value).length > 12 ||
    Object.entries(value).some(
      ([key, n]) => !/^[a-z][a-z0-9_]{0,79}$/.test(key) || !count(n),
    )
  )
    return null;
  return Object.fromEntries(
    Object.entries(value).toSorted(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, number>;
}
export type PendingEntry = {
  ownerId: string | null;
  session: SessionCreate;
  set: SetCreate;
  complete: SessionComplete;
  attempts: number;
  lastAttemptAt: string | null;
};
export function parsePending(value: unknown): PendingEntry | null {
  if (
    !record(value) ||
    (value.ownerId !== null && !uuid(value.ownerId)) ||
    !record(value.session) ||
    !record(value.set) ||
    !record(value.complete) ||
    !count(value.attempts, 1_000_000) ||
    (value.lastAttemptAt !== null && !timestamp(value.lastAttemptAt))
  )
    return null;
  const session = value.session,
    set = value.set,
    complete = value.complete;
  if (
    !uuid(session.client_session_id) ||
    (session.plan_id !== null && !uuid(session.plan_id)) ||
    !timestamp(session.started_at) ||
    !bounded(session.client_engine_version) ||
    !uuid(set.client_set_id) ||
    typeof set.exercise_key !== "string" ||
    !/^[a-z][a-z0-9_]{0,79}$/.test(set.exercise_key) ||
    set.set_index !== 1 ||
    !count(set.total_reps) ||
    !count(set.accepted_reps) ||
    set.accepted_reps > set.total_reps ||
    !count(set.duration_ms, 3_600_000) ||
    !record(set.metrics) ||
    !bounded(set.engine_version) ||
    set.engine_version !== session.client_engine_version ||
    !record(complete.summary) ||
    !timestamp(complete.completed_at)
  )
    return null;
  const generic = parseGenericErrors(set.generic_error_counts),
    summaryGeneric = parseGenericErrors(complete.summary.generic_error_counts);
  if (
    !generic ||
    !summaryGeneric ||
    JSON.stringify(generic) !== JSON.stringify(summaryGeneric)
  )
    return null;
  const errors = errorCounts(set.error_counts),
    summaryErrors = errorCounts(complete.summary.error_counts);
  const duration = set.metrics.mean_rep_duration_ms,
    angle = set.metrics.mean_min_knee_angle;
  if (
    !errors ||
    !summaryErrors ||
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    duration < 0 ||
    duration > 3_600_000 ||
    typeof angle !== "number" ||
    !Number.isFinite(angle) ||
    angle < 0 ||
    angle > 180
  )
    return null;
  if (
    complete.summary.total_reps !== set.total_reps ||
    complete.summary.accepted_reps !== set.accepted_reps ||
    complete.summary.rejected_reps !== set.total_reps - set.accepted_reps ||
    complete.summary.duration_ms !== set.duration_ms ||
    JSON.stringify(errors) !== JSON.stringify(summaryErrors) ||
    Date.parse(complete.completed_at) < Date.parse(session.started_at)
  )
    return null;
  return {
    ownerId: value.ownerId,
    attempts: value.attempts,
    lastAttemptAt: value.lastAttemptAt,
    session: {
      client_session_id: session.client_session_id,
      plan_id: session.plan_id,
      started_at: session.started_at,
      client_engine_version: session.client_engine_version,
    },
    set: {
      client_set_id: set.client_set_id,
      exercise_key: set.exercise_key,
      set_index: 1,
      total_reps: set.total_reps,
      accepted_reps: set.accepted_reps,
      duration_ms: set.duration_ms,
      error_counts: errors,
      ...(Object.keys(generic).length ? { generic_error_counts: generic } : {}),
      metrics: { mean_rep_duration_ms: duration, mean_min_knee_angle: angle },
      engine_version: set.engine_version,
    },
    complete: {
      completed_at: complete.completed_at,
      summary: {
        total_reps: set.total_reps,
        accepted_reps: set.accepted_reps,
        rejected_reps: set.total_reps - set.accepted_reps,
        duration_ms: set.duration_ms,
        error_counts: summaryErrors,
        ...(Object.keys(generic).length
          ? { generic_error_counts: generic }
          : {}),
      },
    },
  };
}
export class PendingQueue {
  private readonly storage: SafeStorage;
  constructor(storage: SafeStorage) {
    this.storage = storage;
  }
  entries(): PendingEntry[] {
    const data = this.storage.read(PENDING_KEY);
    return Array.isArray(data)
      ? data
          .map(parsePending)
          .filter((entry): entry is PendingEntry => entry !== null)
          .slice(0, 20)
      : [];
  }
  add(value: PendingEntry): boolean {
    const entry = parsePending(value);
    if (!entry) return false;
    const entries = this.entries();
    if (
      entries.some(
        (row) =>
          row.session.client_session_id === entry.session.client_session_id,
      )
    )
      return true;
    if (entries.length >= 20) return false;
    this.storage.write(PENDING_KEY, [...entries, entry]);
    return true;
  }
  update(entry: PendingEntry) {
    this.storage.write(
      PENDING_KEY,
      this.entries()
        .map((row) =>
          row.session.client_session_id === entry.session.client_session_id
            ? parsePending(entry)
            : row,
        )
        .filter(Boolean),
    );
  }
  remove(clientId: string) {
    this.storage.write(
      PENDING_KEY,
      this.entries().filter(
        (row) => row.session.client_session_id !== clientId,
      ),
    );
  }
}
export function readProgress(
  storage: SafeStorage,
  ownerId: string,
): Progress | null {
  const cache = storage.read(PROGRESS_KEY);
  if (!record(cache) || cache.ownerId !== ownerId || !record(cache.data))
    return null;
  const p = cache.data,
    errors = errorCounts(p.error_counts, Number.MAX_SAFE_INTEGER);
  if (
    !errors ||
    !count(p.completed_sessions, Number.MAX_SAFE_INTEGER) ||
    !count(p.total_reps, Number.MAX_SAFE_INTEGER) ||
    !count(p.accepted_reps, Number.MAX_SAFE_INTEGER) ||
    p.accepted_reps > p.total_reps ||
    p.rejected_reps !== p.total_reps - p.accepted_reps ||
    typeof p.acceptance_rate !== "number" ||
    !Number.isFinite(p.acceptance_rate) ||
    p.acceptance_rate < 0 ||
    p.acceptance_rate > 1 ||
    !Array.isArray(p.recent_sessions) ||
    p.recent_sessions.length > 20
  )
    return null;
  const recent: Progress["recent_sessions"] = [];
  for (const row of p.recent_sessions) {
    if (
      !record(row) ||
      !uuid(row.id) ||
      typeof row.exercise_key !== "string" ||
      !/^[a-z][a-z0-9_]{0,79}$/.test(row.exercise_key) ||
      !timestamp(row.completed_at) ||
      !count(row.total_reps, 50_000) ||
      !count(row.accepted_reps, 50_000) ||
      row.accepted_reps > row.total_reps ||
      !count(row.duration_ms, 360_000_000) ||
      (row.dominant_error !== null &&
        (typeof row.dominant_error !== "string" ||
          !/^[a-z][a-z0-9_]{0,79}$/.test(row.dominant_error)))
    )
      return null;
    const generic = parseGenericErrors(row.generic_error_counts);
    if (!generic) return null;
    recent.push({
      generic_error_counts: generic,
      id: row.id,
      exercise_key: row.exercise_key,
      completed_at: row.completed_at,
      total_reps: row.total_reps,
      accepted_reps: row.accepted_reps,
      duration_ms: row.duration_ms,
      dominant_error:
        row.dominant_error as Progress["recent_sessions"][number]["dominant_error"],
    });
  }
  return {
    completed_sessions: p.completed_sessions,
    total_reps: p.total_reps,
    accepted_reps: p.accepted_reps,
    rejected_reps: p.rejected_reps as number,
    acceptance_rate: p.acceptance_rate,
    error_counts: errors,
    recent_sessions: recent,
  };
}

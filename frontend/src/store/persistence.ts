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
  sets?: SetCreate[];
  complete: SessionComplete;
  attempts: number;
  lastAttemptAt: string | null;
};
function parseSet(value: unknown, ordinal: number): SetCreate | null {
  if (!record(value) || !uuid(value.client_set_id) || typeof value.exercise_key !== "string" || !/^[a-z][a-z0-9_]{0,79}$/.test(value.exercise_key) || value.set_index !== ordinal || !count(value.total_reps) || !count(value.accepted_reps) || value.accepted_reps > value.total_reps || !count(value.duration_ms, 3_600_000) || !bounded(value.engine_version) || !record(value.metrics)) return null;
  const errors = errorCounts(value.error_counts), generic = parseGenericErrors(value.generic_error_counts);
  const duration = value.metrics.mean_rep_duration_ms, angle = value.metrics.mean_min_knee_angle;
  if (!errors || !generic || (duration !== null && (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || duration > 3_600_000)) || (angle !== null && (typeof angle !== "number" || !Number.isFinite(angle) || angle < 0 || angle > 180))) return null;
  if (value.assessment_mode !== undefined && !["camera", "manual"].includes(String(value.assessment_mode))) return null;
  if (value.completion_status !== undefined && !["completed", "partial"].includes(String(value.completion_status))) return null;
  if (value.spec_revision !== undefined && value.spec_revision !== null && !uuid(value.spec_revision)) return null;
  if (value.assessment_mode === "manual" && (value.accepted_reps !== 0 || Object.values(errors).some(Boolean) || Object.values(generic).some(Boolean))) return null;
  let target: SetCreate["target_snapshot"];
  if (value.target_snapshot !== undefined && value.target_snapshot !== null) {
    const t = value.target_snapshot;
    if (!record(t) || (t.target_reps !== null && !count(t.target_reps)) || (t.duration_seconds !== null && !count(t.duration_seconds, 3600)) || !count(t.rest_seconds, 3600) || !count(t.plan_sets, 100) || t.plan_sets === 0) return null;
    target = { target_reps: t.target_reps, duration_seconds: t.duration_seconds, rest_seconds: t.rest_seconds, plan_sets: t.plan_sets };
  }
  return { client_set_id: value.client_set_id, exercise_key: value.exercise_key, set_index: ordinal, total_reps: value.total_reps, accepted_reps: value.accepted_reps, duration_ms: value.duration_ms, error_counts: errors, ...(Object.keys(generic).length ? { generic_error_counts: generic } : {}), metrics: { mean_rep_duration_ms: duration, mean_min_knee_angle: angle }, engine_version: value.engine_version,
    ...(value.assessment_mode !== undefined ? { assessment_mode: value.assessment_mode as 'camera' | 'manual' } : {}), ...(value.completion_status !== undefined ? { completion_status: value.completion_status as 'completed' | 'partial' } : {}), ...(value.spec_revision !== undefined ? { spec_revision: value.spec_revision as string | null } : {}), ...(target ? { target_snapshot: target } : {}) };
}
export function parsePending(value: unknown): PendingEntry | null {
  if (!record(value) || (value.ownerId !== null && !uuid(value.ownerId)) || !record(value.session) || !record(value.complete) || !count(value.attempts, 1_000_000) || (value.lastAttemptAt !== null && !timestamp(value.lastAttemptAt))) return null;
  const session = value.session, complete = value.complete;
  if (!uuid(session.client_session_id) || (session.plan_id !== null && !uuid(session.plan_id)) || !timestamp(session.started_at) || !bounded(session.client_engine_version) || !record(complete.summary) || !timestamp(complete.completed_at) || Date.parse(complete.completed_at) < Date.parse(session.started_at)) return null;
  const rows = value.sets === undefined ? [value.set] : value.sets;
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) return null;
  const sets = rows.map((row, index) => parseSet(row, index + 1));
  if (sets.some(row => !row)) return null;
  const valid = sets as SetCreate[];
  if (new Set(valid.map(row => row.client_set_id)).size !== valid.length) return null;
  if (value.sets === undefined && valid[0].engine_version !== session.client_engine_version) return null;
  const total = valid.reduce((n,row) => n + row.total_reps, 0), accepted = valid.reduce((n,row) => n + row.accepted_reps, 0), camera = valid.filter(row => row.assessment_mode !== 'manual').reduce((n,row) => n + row.total_reps, 0), duration = valid.reduce((n,row) => n + row.duration_ms, 0);
  const errors: ErrorCounts = { depth_insufficient: 0, too_fast: 0, incomplete_extension: 0 }, generic: Record<string, number> = {};
  for (const row of valid) { for (const key of Object.keys(errors) as (keyof ErrorCounts)[]) errors[key] += row.error_counts[key]; for (const [key,n] of Object.entries(row.generic_error_counts ?? {})) generic[key] = (generic[key] ?? 0) + n; }
  const summary = complete.summary, summaryErrors = errorCounts(summary.error_counts), summaryGeneric = parseGenericErrors(summary.generic_error_counts);
  if (summary.total_reps !== total || summary.accepted_reps !== accepted || summary.rejected_reps !== camera - accepted || summary.duration_ms !== duration || !summaryErrors || !summaryGeneric || JSON.stringify(summaryErrors) !== JSON.stringify(errors) || JSON.stringify(summaryGeneric) !== JSON.stringify(parseGenericErrors(generic))) return null;
  if (summary.total_sets !== undefined && summary.total_sets !== valid.length) return null;
  if (summary.camera_total_reps !== undefined && summary.camera_total_reps !== camera) return null;
  const manual = valid.filter(row => row.assessment_mode === 'manual' && row.completion_status !== 'partial').length;
  if (summary.manual_completed_sets !== undefined && summary.manual_completed_sets !== manual) return null;
  return { ownerId: value.ownerId, attempts: value.attempts, lastAttemptAt: value.lastAttemptAt, session: { client_session_id: session.client_session_id, plan_id: session.plan_id, started_at: session.started_at, client_engine_version: session.client_engine_version }, set: valid[0], ...(value.sets === undefined ? {} : { sets: valid }), complete: { completed_at: complete.completed_at, summary: { total_reps: total, accepted_reps: accepted, rejected_reps: camera - accepted, duration_ms: duration, error_counts: errors, generic_error_counts: generic, ...(summary.total_sets === undefined ? {} : { total_sets: valid.length, camera_total_reps: camera, manual_completed_sets: manual }) } } };
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
    p.rejected_reps !== (typeof p.camera_total_reps === "number" ? p.camera_total_reps : p.total_reps) - p.accepted_reps ||
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

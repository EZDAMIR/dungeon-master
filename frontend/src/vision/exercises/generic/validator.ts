import schema from "./schema.json";
import type { MovementSpec } from "./types";
type Schema = {
  $ref?: string;
  anyOf?: Schema[];
  type?: string;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
};
const obj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
function check(value: unknown, s: Schema): unknown {
  if (s.$ref)
    return check(
      value,
      (schema.$defs as Record<string, Schema>)[s.$ref.split("/").at(-1)!],
    );
  if (value === undefined && "default" in s) value = structuredClone(s.default);
  if (s.anyOf) {
    for (const option of s.anyOf) {
      try {
        return check(value, option);
      } catch {
        /* Try the next declared schema. */
      }
    }
    throw Error("type");
  }
  if (s.const !== undefined && value !== s.const) throw Error("constant");
  if (s.enum && !s.enum.includes(value)) throw Error("enum");
  if (s.type === "null" && value !== null) throw Error("null");
  if (s.type === "boolean" && typeof value !== "boolean")
    throw Error("boolean");
  if (s.type === "object") {
    if (!obj(value)) throw Error("object");
    const props = s.properties ?? {};
    if (
      s.additionalProperties === false &&
      Object.keys(value).some((k) => !(k in props))
    )
      throw Error("unknown field");
    if (s.required?.some((k) => !(k in value))) throw Error("required field");
    return Object.fromEntries(
      Object.entries(props)
        .filter(([k, p]) => k in value || "default" in p)
        .map(([k, p]) => [k, check(value[k], p)]),
    );
  }
  if (s.type === "array") {
    if (
      !Array.isArray(value) ||
      value.length < (s.minItems ?? 0) ||
      value.length > (s.maxItems ?? Infinity)
    )
      throw Error("array bound");
    return value.map((v) => check(v, s.items ?? {}));
  }
  if (s.type === "string") {
    if (
      typeof value !== "string" ||
      Array.from(value).length < (s.minLength ?? 0) ||
      Array.from(value).length > (s.maxLength ?? Infinity) ||
      (s.pattern && !new RegExp(s.pattern).test(value))
    )
      throw Error("text bound");
  }
  if (s.type === "number" || s.type === "integer") {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      (s.type === "integer" && !Number.isInteger(value)) ||
      value < (s.minimum ?? -Infinity) ||
      value > (s.maximum ?? Infinity)
    )
      throw Error("numeric bound");
  }
  return value;
}
export function validateSpec(
  value: unknown,
): { valid: true; spec: MovementSpec } | { valid: false; reason: string } {
  try {
    const spec = check(value, schema as Schema) as MovementSpec;
    const features = new Set<string>(),
      stages = new Set(spec.phases.map((p) => p.id)),
      codes = new Set(spec.error_rules.map((r) => r.code));
    if (
      stages.size !== spec.phases.length ||
      codes.size !== spec.error_rules.length
    )
      throw Error("duplicate identity");
    const landmark =
      /^(nose|(?:(?:left|right|active)_)?(?:shoulder|elbow|wrist|hip|knee|ankle|heel|foot_index))$/;
    const arities: Partial<Record<string, number>> = {
      angle: 3,
      distance: 2,
      normalized_distance: 2,
      relative_x: 2,
      relative_y: 2,
      position_x: 1,
      position_y: 1,
      velocity_x: 1,
      velocity_y: 1,
      visibility: 1,
      body_scale: 0,
    };
    for (const f of spec.features) {
      if (
        features.has(f.id) ||
        f.inputs.some((id) => !features.has(id)) ||
        f.points.some((p) => !landmark.test(p))
      )
        throw Error("feature reference");
      const aggregate = ["average", "minimum", "maximum"].includes(f.operation);
      if (
        f.operation in arities &&
        (f.points.length !== arities[f.operation] || f.inputs.length)
      )
        throw Error("operation arity");
      if (
        (aggregate || f.operation === "delta") &&
        (f.points.length ||
          !f.inputs.length ||
          (f.operation === "delta" && f.inputs.length !== 1))
      )
        throw Error("input arity");
      if (f.scope === "rep" && !aggregate) throw Error("rep scope");
      features.add(f.id);
    }
    const conditions = [
      ...spec.transitions.map((t) => t.condition),
      ...spec.error_rules.map((r) => r.condition),
    ];
    if (
      conditions.some(
        (c) =>
          !features.has(c.feature) ||
          (c.operator === "between" && (c.upper === null || c.upper < c.value)),
      )
    )
      throw Error("condition reference");
    if (
      spec.camera.required_landmarks.some((p) => !landmark.test(p)) ||
      spec.calibration.baseline_features.some((f) => !features.has(f))
    )
      throw Error("calibration reference");
    if (
      spec.transitions.some(
        (t) => !stages.has(t.from) || !stages.has(t.to) || t.from === t.to,
      )
    )
      throw Error("transition reference");
    const rep = spec.repetition;
    if (
      ![rep.start_phase, rep.complete_from, rep.complete_to].every((p) =>
        stages.has(p),
      ) ||
      rep.complete_to !== rep.start_phase ||
      rep.minimum_duration_ms >= rep.maximum_duration_ms ||
      !spec.transitions.some(
        (t) => t.from === rep.complete_from && t.to === rep.complete_to,
      )
    )
      throw Error("completion");
    const visited = new Set([rep.start_phase]);
    for (let i = 0; i < 8; i++)
      for (const t of spec.transitions)
        if (visited.has(t.from)) visited.add(t.to);
    if (visited.size !== stages.size) throw Error("unreachable stage");
    if (
      spec.phases.some((p) =>
        Object.values(p.messages).some((v) => v && Array.from(v).length > 32),
      )
    )
      throw Error("label bound");
    const cues = [
      spec.calibration.messages,
      ...spec.phases.map((p) => p.messages),
      ...spec.error_rules.map((r) => r.messages),
      ...Object.values(spec.coach_messages).map((c) => c.messages),
    ];
    if (
      cues.some(
        (m) =>
          !Object.values(m).some(Boolean) ||
          Object.values(m).some((v) => v && v.split("\n").length > 2),
      )
    )
      throw Error("message");
    return { valid: true, spec };
  } catch {
    return {
      valid: false,
      reason: "Для этого упражнения пока доступно ручное выполнение",
    };
  }
}

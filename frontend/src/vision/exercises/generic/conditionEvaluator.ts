import type { Condition } from "./types";
export function condition(
  c: Condition,
  values: Record<string, number>,
  previous: Record<string, number>,
): boolean {
  const v = values[c.feature];
  if (!Number.isFinite(v)) return false;
  switch (c.operator) {
    case "gt":
      return v > c.value;
    case "gte":
      return v >= c.value;
    case "lt":
      return v < c.value;
    case "lte":
      return v <= c.value;
    case "between":
      return c.upper !== null && v >= c.value && v <= c.upper;
    case "approximately":
      return Math.abs(v - c.value) <= c.tolerance;
    case "trend_up":
      return (
        Number.isFinite(previous[c.feature]) &&
        v - previous[c.feature] > c.value
      );
    case "trend_down":
      return (
        Number.isFinite(previous[c.feature]) &&
        previous[c.feature] - v > c.value
      );
  }
}

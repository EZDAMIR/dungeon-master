import { condition } from "./conditionEvaluator";
import type { MovementSpec } from "./types";
export class PhaseMachine {
  stage: string;
  private held = new Map<number, number>();
  private began: number | null = null;
  private visited = new Set<string>();
  private spec: MovementSpec;
  constructor(spec: MovementSpec) {
    this.spec = spec;
    this.stage = spec.repetition.start_phase;
  }
  cancel() {
    this.stage = this.spec.repetition.start_phase;
    this.held.clear();
    this.began = null;
    this.visited.clear();
  }
  update(
    values: Record<string, number>,
    previous: Record<string, number>,
    at: number,
  ) {
    if (
      this.began !== null &&
      at - this.began > this.spec.repetition.maximum_duration_ms
    )
      this.cancel();
    for (const [index, t] of this.spec.transitions.entries()) {
      if (t.from !== this.stage || !condition(t.condition, values, previous)) {
        this.held.delete(index);
        continue;
      }
      if (!this.held.has(index)) this.held.set(index, at);
      if (at - this.held.get(index)! < t.hold_ms) continue;
      const from = this.stage;
      this.stage = t.to;
      this.held.clear();
      if (this.began === null) {
        this.began = at;
        this.visited.add(from);
      }
      this.visited.add(t.to);
      const duration = at - this.began;
      const completed =
        from === this.spec.repetition.complete_from &&
        t.to === this.spec.repetition.complete_to &&
        this.visited.size >= 2;
      if (completed) {
        this.began = null;
        this.visited.clear();
      }
      return { stage: this.stage, completed, duration, changed: true };
    }
    return { stage: this.stage, completed: false, duration: 0, changed: false };
  }
}

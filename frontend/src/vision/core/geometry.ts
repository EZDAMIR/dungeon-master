export type Point = { x: number; y: number }
export const clamp = (value: number, min = 0, max = 1) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

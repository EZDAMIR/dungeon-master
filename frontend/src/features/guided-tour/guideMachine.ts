export type GuideEvent = 'voice.selected' | 'context.opened' | 'plan.ready' | 'exercise.opened' | 'camera.ready' | 'gesture.success' | 'calibration.completed' | 'countdown.started' | 'workout.started' | 'rest.started' | 'results.opened' | 'progress.opened';
export const guideSteps = [
  { event: 'voice.selected', target: 'voice', text: 'Выберите голос или продолжите без звука.', cue: 'welcome' },
  { event: 'context.opened', target: 'context', text: 'Расскажите о целях и доступном времени.', cue: 'context_choice' },
  { event: 'plan.ready', target: 'plan', text: 'Создайте план. Мы дождёмся готового результата.', cue: 'plan_generating' },
  { event: 'exercise.opened', target: 'exercise', text: 'Откройте инструкции выбранного упражнения.', cue: 'plan_ready' },
  { event: 'camera.ready', target: 'camera', text: 'Включите камеру настоящим нажатием. Разрешение выдаёт браузер.', cue: 'camera_permission' },
  { event: 'gesture.success', target: 'gesture', text: 'Наведите указательным пальцем и соедините пальцы для выбора.', cue: 'gesture_pinch' },
  { event: 'calibration.completed', target: 'calibration', text: 'Займите указанное положение. Дождитесь успешной калибровки.', cue: 'camera_permission' },
  { event: 'countdown.started', target: 'countdown', text: 'Приготовьтесь. Дождитесь отсчёта.', cue: 'countdown_3' },
  { event: 'workout.started', target: 'workout', text: 'Следуйте крупной подсказке. При потере тела счёт останавливается.', cue: 'start' },
  { event: 'rest.started', target: 'rest', text: 'Отдохните. Следующий подход начнётся после вашей готовности.', cue: 'rest' },
  { event: 'results.opened', target: 'results', text: 'Посмотрите фактические результаты и статус сохранения.', cue: 'workout_complete' },
  { event: 'progress.opened', target: 'progress', text: 'Откройте прогресс после сохранения.', cue: 'workout_complete' },
] as const;
export class GuideMachine {
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish() { for (const listener of this.listeners) listener(); }
  private step = 0;
  private stopped = false;
  private seen = new Set<GuideEvent>();
  getSnapshot = () => this.stopped || this.step >= guideSteps.length ? null : guideSteps[this.step];
  consume(event: GuideEvent) { if (this.stopped) return; this.seen.add(event); this.advance(); this.publish(); }
  private advance() { while (this.step < guideSteps.length && this.seen.has(guideSteps[this.step].event)) this.step++; }
  skip() { this.step++; this.advance(); this.publish(); }
  stop() { this.stopped = true; this.publish(); }
  restart() { this.step = 0; this.stopped = false; this.seen.clear(); this.publish(); }
}

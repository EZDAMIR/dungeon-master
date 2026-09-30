import type { ErrorCode, Progress } from "../api/types";
import { GestureTarget } from "../features/gesture-navigation/GestureTarget";
const labels: Record<ErrorCode, string> = {
  depth_insufficient: "Недостаточная глубина",
  too_fast: "Слишком быстро",
  incomplete_extension: "Неполное выпрямление",
};
export function ProgressPage({
  progress,
  cached,
  pending,
  onRetry,
  onBack,
}: {
  progress: Progress | null;
  cached: boolean;
  pending: number;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <section className="backend-page" data-figma-node="3:143">
      <p className="dm-label">YOUR PROGRESS / SMALL STEPS ADD UP</p>
      <h2>Progress you can feel.</h2>
      <p>Прогресс · Только сохранённые тренировки</p>
      {cached && (
        <p role="status">Сохранённая копия · Данные могут быть устаревшими</p>
      )}
      {!progress || !progress.completed_sessions ? (
        <p>После первой сохранённой тренировки здесь появится прогресс</p>
      ) : (
        <>
          <dl className="progress-totals">
            <div>
              <dt>Тренировок</dt>
              <dd>{progress.completed_sessions}</dd>
            </div>
            <div>
              <dt>Все повторения</dt>
              <dd>{progress.total_reps}</dd>
            </div>
            <div>
              <dt>Оценены камерой</dt>
              <dd>{progress.camera_total_reps ?? progress.total_reps}</dd>
            </div>
            <div>
              <dt>Подходов вручную</dt>
              <dd>{progress.manual_completed_sets ?? 0}</dd>
            </div>
            <div>
              <dt>Корректные</dt>
              <dd>{progress.accepted_reps}</dd>
            </div>
            <div>
              <dt>Доля корректных</dt>
              <dd>{Math.round(progress.acceptance_rate * 100)}%</dd>
            </div>
          </dl>
          <div className="dm-panel">
            <h3>Контроль движения</h3>
            {(Object.entries(labels) as [ErrorCode, string][]).map(
              ([code, label]) => (
                <div key={code}>
                  <span>
                    {label}: {progress.error_counts[code]}
                  </span>
                  <div
                    className="error-bar"
                    role="meter"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, progress.total_reps)}
                    aria-valuenow={progress.error_counts[code]}
                  >
                    <span
                      style={{
                        width: `${Math.min(100, (progress.error_counts[code] / Math.max(1, progress.total_reps)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
          <h3>Последние тренировки</h3>
          <ul>
            {progress.recent_sessions.map((session) => (
              <li key={session.id}>
                {new Date(session.completed_at).toLocaleDateString()} ·{" "}
                {session.exercise_key === "bodyweight_squat"
                  ? "Bodyweight Squat"
                  : session.exercise_key
                      .replace(/_[a-f0-9]{12}(?:_[a-f0-9]{12})?$/, "")
                      .replace(/_/g, " ")}{" "}
                · {session.accepted_reps}/{session.total_reps} корректных ·{" "}
                {(session.duration_ms / 1000).toFixed(0)} с
                {session.dominant_error &&
                  ` · ${labels[session.dominant_error as ErrorCode] ?? (session.dominant_error === "range_too_small" ? "Увеличьте амплитуду движения" : "Контроль движения")}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {!!pending && <p>Ожидают синхронизации: {pending}</p>}
      <div className="settings-grid">
        <GestureTarget id="progress-retry" onSelect={onRetry}>
          Повторить синхронизацию
        </GestureTarget>
        <GestureTarget id="progress-back" onSelect={onBack}>
          Назад в меню
        </GestureTarget>
      </div>
    </section>
  );
}

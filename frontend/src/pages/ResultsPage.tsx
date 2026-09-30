import { useTranslation } from '../shared/uiLanguage'
import type { WorkoutResult } from "../app/modes";
import { recommendation } from "../vision/exercises/squat/resultBuilder";
import { GestureTarget } from "../features/gesture-navigation/GestureTarget";
export function ResultsPage({
  result,
  onRepeat,
  onMenu,
  syncMessage,
  onRetry,
  exercise,
  persona,
  onProgress,
}: {
  result: WorkoutResult;
  onRepeat: () => void;
  onMenu: () => void;
  syncMessage: string;
  onRetry: () => void;
  exercise?: string;
  persona?: string;
  onProgress?: () => void;
}) {
  const { translateUi } = useTranslation()

  const generic = result.engineVersion !== "squat-v1",
    manual = result.engineVersion === "manual-v1";
  const message = generic
    ? manual
      ? "Выполнение отмечено вручную. Камера не оценивала технику."
      : result.rejectedReps > 0
        ? persona === "energetic"
          ? "Продолжай! Следующий подход — с контролем диапазона."
          : "Повтори спокойно. Сохрани контролируемый темп и диапазон."
        : persona === "energetic"
          ? "Отличный контроль! Отдохни перед следующим подходом."
          : "Хорошая работа. Отдохни и сохрани этот темп."
    : recommendation(result);
  return (
    <section className="results-page editorial-grid" data-figma-node="3:141">
      <div className="dm-panel citron">
        <p className="dm-label">
          {translateUi(manual ? "MANUAL COMPLETION" : "SESSION / LOCAL METRICS")}
        </p>
        <h1>{translateUi("YOU")}<br />{translateUi("SHOWED")}<br />{translateUi("UP.")}</h1>
        <h3>{translateUi("Подход завершён")}</h3>
        <p>{translateUi(exercise ?? "Bodyweight Squat")}</p>
        <table>
          <tbody>
            {!manual && (
              <>
                <tr>
                  <th>{translateUi("Всего повторений")}</th>
                  <td>
                    {result.totalReps} / {result.targetReps}
                  </td>
                </tr>
                <tr>
                  <th>{translateUi("Корректные повторения")}</th>
                  <td>{result.acceptedReps}</td>
                </tr>
                <tr>
                  <th>{translateUi("Повторения с ошибками")}</th>
                  <td>{result.rejectedReps}</td>
                </tr>
                <tr>
                  <th>{translateUi("Доля корректных повторений")}</th>
                  <td>
                    {result.totalReps
                      ? Math.round(
                          (result.acceptedReps / result.totalReps) * 100,
                        )
                      : 0}
                    %
                  </td>
                </tr>
              </>
            )}
            {!generic && (
              <>
                <tr>
                  <th>{translateUi("Недостаточная глубина")}</th>
                  <td>{result.errorCounts.depth_insufficient}</td>
                </tr>
                <tr>
                  <th>{translateUi("Слишком быстро")}</th>
                  <td>{result.errorCounts.too_fast}</td>
                </tr>
                <tr>
                  <th>{translateUi("Неполное выпрямление")}</th>
                  <td>{result.errorCounts.incomplete_extension}</td>
                </tr>
              </>
            )}
            {generic &&
              Object.entries(result.genericErrorCounts ?? {}).map(
                ([code, n]) => (
                  <tr key={code}>
                    <th>
                      {translateUi(code === "too_fast"
                        ? "Слишком быстро"
                        : code === "range_too_small"
                          ? "Недостаточный диапазон"
                          : code.replace(/_/g, " "))}
                    </th>
                    <td>{n}</td>
                  </tr>
                ),
              )}
            {!manual && (
              <tr>
                <th>{translateUi("Среднее время повторения")}</th>
                <td>{translateUi((result.meanRepDurationMs / 1000).toFixed(1))}{translateUi(" с")}</td>
              </tr>
            )}
            <tr>
              <th>{translateUi("Время подхода")}</th>
              <td>{translateUi((result.durationMs / 1000).toFixed(0))}{translateUi(" с")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="dm-panel">
        <h2>{translateUi("THE MOMENT")}<br />{translateUi("THAT MATTERED.")}</h2>
        <p className="instruction">{translateUi(message)}</p>
        <p role="status" aria-live="polite">
          {translateUi(syncMessage)}
        </p>
        <div className="results-actions">
          <GestureTarget id="results-sync" onSelect={onRetry}>{translateUi("Повторить синхронизацию")}</GestureTarget>
          <GestureTarget id="repeat-squat" onSelect={onRepeat}>{translateUi("Повторить подход")}</GestureTarget>
          <GestureTarget id="results-menu" onSelect={onMenu}>{translateUi("Вернуться в меню")}</GestureTarget>
          {onProgress && (
            <GestureTarget id="results-progress" onSelect={onProgress}>{translateUi("Открыть progress")}</GestureTarget>
          )}
        </div>
        <p>{translateUi("👍 Повторить подход · ✊ Вернуться в меню · или выбери кнопку щипком.")}</p>
      </div>
    </section>
  );
}

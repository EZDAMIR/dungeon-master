export function CalibrationPage({onBack,onDone}:{onBack:()=>void;onDone?:()=>void}) {
  return <section><h2>CALIBRATION</h2><p className="instruction">Bodyweight Squat выбран и подтверждён.</p>
    <p>Калибровка позы будет реализована в Sprint 2. Sprint 1 завершает сценарий на этом экране.</p>
    <p>✊ Удерживай кулак, чтобы вернуться в меню.</p>
    <details className="fallback"><summary>Доступное управление</summary><button type="button" onClick={onBack}>Назад в меню</button>{onDone && <button type="button" onClick={onDone}>Продолжить scaffold demo</button>}</details>
  </section>
}

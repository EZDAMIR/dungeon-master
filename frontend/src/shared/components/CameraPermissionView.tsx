export function CameraPermissionView({onStart,loading}:{onStart:()=>void;loading:boolean}) {
  return <section>
    <h2>Управляй приложением жестами</h2>
    <p>Разреши камеру, затем пройди обучение и выбери тренировку движениями руки.</p>
    <p>Видео обрабатывается локально, не записывается и не загружается.</p>
    <button type="button" className="primary-action" disabled={loading} onClick={onStart}>{loading ? 'Включение…' : 'Включить камеру'}</button>
  </section>
}

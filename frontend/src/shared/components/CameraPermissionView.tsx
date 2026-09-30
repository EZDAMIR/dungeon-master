import { useTranslation } from '../uiLanguage'
export function CameraPermissionView({
  onStart,
  loading,
  instruction,
}: {
  onStart: () => void;
  loading: boolean;
  instruction?: string;
}) {
  const { translateUi } = useTranslation()

  return (
    <section className="camera-setup dm-panel" data-figma-node="3:126">
      <h2>
        {translateUi(instruction
          ? "SET YOUR CAMERA. FIND YOUR SPACE."
          : "Управляй приложением жестами")}
      </h2>
      <p>
        {translateUi(instruction ||
          "Разреши камеру, затем пройди обучение и выбери тренировку движениями руки.")}
      </p>
      <p>{translateUi("Видео обрабатывается локально, не записывается и не загружается.")}</p>
      {loading && <CameraLoading />}
      <button
        type="button"
        className="primary-action"
        disabled={loading}
        onClick={onStart}
      >
        {translateUi(loading ? "Подготовка камеры…" : "Включить камеру")}
      </button>
    </section>
  );
}
import { CameraLoading } from './CameraLoading';

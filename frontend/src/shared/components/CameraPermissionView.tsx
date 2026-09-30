export function CameraPermissionView({
  onStart,
  loading,
  instruction,
}: {
  onStart: () => void;
  loading: boolean;
  instruction?: string;
}) {
  return (
    <section className="camera-setup dm-panel" data-figma-node="3:126">
      <h2>
        {instruction
          ? "SET YOUR CAMERA. FIND YOUR SPACE."
          : "Управляй приложением жестами"}
      </h2>
      <p>
        {instruction ||
          "Разреши камеру, затем пройди обучение и выбери тренировку движениями руки."}
      </p>
      <p>Видео обрабатывается локально, не записывается и не загружается.</p>
      <button
        type="button"
        className="primary-action"
        disabled={loading}
        onClick={onStart}
      >
        {loading ? "Включение…" : "Включить камеру"}
      </button>
    </section>
  );
}

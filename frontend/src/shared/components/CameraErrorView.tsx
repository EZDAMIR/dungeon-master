export function CameraErrorView({
  message,
  onRetry,
  onManual,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onManual?: () => void;
  onBack?: () => void;
}) {
  return (
    <section className="camera-error dm-panel" data-figma-node="3:127">
      <p className="coach-badge experimental">CAMERA NOT AVAILABLE</p>
      <h2>
        THE CAMERA IS OFF.
        <br />
        YOUR SESSION ISN’T.
      </h2>
      <p role="alert">{message}</p>
      <p>Разрешите камеру в настройках браузера и повторите попытку.</p>
      <div className="dm-actions">
        <button type="button" className="primary-action" onClick={onRetry}>
          Повторить / Retry
        </button>
        {onManual && <button onClick={onManual}>Use guided mode</button>}
        {onBack && <button onClick={onBack}>Назад к плану</button>}
      </div>
    </section>
  );
}

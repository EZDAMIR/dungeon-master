import { useTranslation } from '../uiLanguage'
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
  const { translateUi } = useTranslation()

  return (
    <section className="camera-error dm-panel" data-figma-node="3:127">
      <p className="coach-badge experimental">{translateUi("CAMERA NOT AVAILABLE")}</p>
      <h2>{translateUi("THE CAMERA IS OFF.")}<br />{translateUi("YOUR SESSION ISN’T.")}</h2>
      <p role="alert">{translateUi(message)}</p>
      <p>{translateUi("Разрешите камеру в настройках браузера и повторите попытку.")}</p>
      <div className="dm-actions">
        <button type="button" className="primary-action" onClick={onRetry}>{translateUi("Повторить / Retry")}</button>
        {onManual && <button onClick={onManual}>{translateUi("Use guided mode")}</button>}
        {onBack && <button onClick={onBack}>{translateUi("Назад к плану")}</button>}
      </div>
    </section>
  );
}

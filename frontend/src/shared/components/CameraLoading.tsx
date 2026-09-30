import { useTranslation } from '../uiLanguage'
import './cameraLoading.css'

export function CameraLoading() {
  const { translateUi } = useTranslation()

  return <div className="camera-loading" role="status" aria-live="polite" aria-busy="true">
    <div className="camera-loading-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="12" y="20" width="40" height="28" rx="7"/>
        <path d="M23 20l4-6h10l4 6"/>
        <circle cx="32" cy="34" r="8"/>
        <circle cx="45" cy="26" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
    <strong>{translateUi("Готовим камеру и управление")}</strong>
    <p>{translateUi("Разреши доступ к камере в окне браузера. Загружаем и запускаем всё для распознавания движений.")}</p>
    <div className="camera-loading-track" role="progressbar" aria-label={translateUi("Подготовка камеры и распознавания")}><span/></div>
    <small>{translateUi("Первый запуск может занять немного времени. Оставь страницу открытой — обучение продолжится, когда всё будет готово.")}</small>
  </div>
}

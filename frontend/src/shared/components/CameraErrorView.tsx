export function CameraErrorView({message,onRetry}:{message:string;onRetry:()=>void}) {
  return <section className="camera-error"><p role="alert">{message}</p><button type="button" className="primary-action" onClick={onRetry}>Повторить / Retry</button></section>
}

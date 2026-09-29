import type { VisionEvent } from '../types/vision'
export class GestureAudio {
  private context: AudioContext | null = null
  async enable() {
    try { this.context ??= new AudioContext(); await this.context.resume() } catch { /* Visual feedback remains usable. */ }
  }
  event(event: VisionEvent) {
    if (event.type !== 'gesture.confirmed' || (event.command==='select' && !event.targetId)) return
    this.tone(event.command==='select' ? 520 : event.command==='confirm' ? 780 : 360)
  }
  tone(frequency=520) {
    try {
      const ctx = this.context
      if (!ctx || ctx.state!=='running') return
      const oscillator=ctx.createOscillator(), gain=ctx.createGain()
      oscillator.frequency.value=frequency
      gain.gain.setValueAtTime(.05,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.1)
      oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.1)
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}
    } catch { /* Audio failure must not interrupt navigation. */ }
  }
  close() { void this.context?.close().catch(()=>{});this.context=null }
}

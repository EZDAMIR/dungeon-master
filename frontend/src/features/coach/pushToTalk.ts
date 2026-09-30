export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'denied' | 'unsupported';
export class PushToTalk {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private epoch = 0;
  private startedAt = 0;
  private onStatus: (status: RecordingStatus) => void;
  private onRecording: (file: Blob, seconds: number) => void;
  constructor(onStatus: (status: RecordingStatus) => void, onRecording: (file: Blob, seconds: number) => void) { this.onStatus = onStatus; this.onRecording = onRecording; }
  async start() {
    this.cancel(); const epoch = ++this.epoch;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) { this.onStatus('unsupported'); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mime) { this.onStatus('unsupported'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (epoch !== this.epoch) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream; this.recorder = new MediaRecorder(stream, { mimeType: mime }); this.startedAt = Date.now();
      this.recorder.ondataavailable = event => { this.bytes += event.data.size; if (this.bytes > 4 * 1024 * 1024) { this.cancel(); this.onStatus('unsupported'); return; } this.chunks.push(event.data); };
      this.recorder.onstop = () => {
        if (epoch !== this.epoch) return;
        const file = new Blob(this.chunks, { type: mime }); const seconds = (Date.now() - this.startedAt) / 1000;
        this.release(); if (seconds > 30.5) { this.onStatus('unsupported'); return; } this.onStatus('processing'); if (file.size) this.onRecording(file, Math.min(30, seconds)); else this.onStatus('idle');
      };
      this.recorder.onerror = () => { this.cancel(); this.onStatus('denied'); };
      this.recorder.start(250); this.onStatus('recording'); this.timer = setTimeout(() => this.stop(), 30000);
    } catch { if (epoch === this.epoch) { this.release(); this.onStatus('denied'); } }
  }
  stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; if (this.recorder?.state === 'recording') this.recorder.stop(); }
  private release() { if (this.timer) clearTimeout(this.timer); this.timer = null; this.stream?.getTracks().forEach(track => track.stop()); this.stream = null; this.recorder = null; this.chunks = []; this.bytes = 0; }
  cancel() { this.epoch++; if (this.recorder) { this.recorder.onstop = null; if (this.recorder.state === 'recording') this.recorder.stop(); } this.release(); this.onStatus('idle'); }
}

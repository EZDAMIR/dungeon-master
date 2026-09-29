export const now = () => performance.now()
// Development replay shares this clock between hand controls and pose sequences.
export class ReplayClock {
 private last=0
 read(at=now()){this.last=Math.max(this.last,at);return this.last}
}

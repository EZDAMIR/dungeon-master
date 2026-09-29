import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { RealGestureSource } from '../RealGestureSource'
import type { VisionEvent } from '../../../types/vision'
import type { GestureRecognizerAdapter } from '../../../vision/gestures/types'

let frames: Map<number, FrameRequestCallback>, nextId: number, hidden: boolean
beforeEach(() => {
  frames=new Map();nextId=0;hidden=false
  vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{frames.set(++nextId,callback);return nextId}))
  vi.stubGlobal('cancelAnimationFrame',vi.fn((id:number)=>frames.delete(id)))
  vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden)
  Object.defineProperty(window,'isSecureContext',{value:true,configurable:true})
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
function setup() {
  const track=new EventTarget() as MediaStreamTrack;track.stop=vi.fn()
  const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:vi.fn().mockResolvedValue(stream)},configurable:true})
  const video=document.createElement('video');video.play=vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(video,'readyState',{value:2,configurable:true})
  Object.defineProperty(video,'currentTime',{value:0,writable:true})
  const adapter:GestureRecognizerAdapter={initialize:vi.fn().mockResolvedValue(undefined),recognize:vi.fn().mockReturnValue(null),close:vi.fn()}
  const events:VisionEvent[]=[],raw=vi.fn()
  const source=new RealGestureSource(video,e=>events.push(e),raw,adapter)
  const tick=(at:number)=>{video.currentTime=at/1000;const [id,callback]=[...frames][0];frames.delete(id);callback(at)}
  return {source,adapter,events,raw,track,tick,video}
}
describe('real source lifecycle and scheduling',()=>{
  it('starts once, throttles inference, skips duplicate frames and stops on disposal',async()=>{
    const s=setup()
    await Promise.all([s.source.start(),s.source.start()])
    expect(s.adapter.initialize).toHaveBeenCalledOnce();expect(frames.size).toBe(1)
    s.tick(0);s.tick(16);s.tick(54);s.tick(55)
    expect(s.adapter.recognize).toHaveBeenCalledTimes(2)
    const [id,callback]=[...frames][0];frames.delete(id);callback(120)
    expect(s.adapter.recognize).toHaveBeenCalledTimes(2)
    s.source.dispose();s.source.dispose()
    expect(frames.size).toBe(0);expect(s.track.stop).toHaveBeenCalledOnce();expect(s.adapter.close).toHaveBeenCalledOnce()
    const count=s.events.length
    await s.source.start();callback(300)
    expect(s.events).toHaveLength(count)
  })
  it('pauses on hidden and resumes with exactly one loop',async()=>{
    const s=setup();await s.source.start()
    hidden=true;document.dispatchEvent(new Event('visibilitychange'));expect(frames.size).toBe(0)
    hidden=false;document.dispatchEvent(new Event('visibilitychange'));expect(frames.size).toBe(1)
    document.dispatchEvent(new Event('visibilitychange'));expect(frames.size).toBe(1)
    s.source.dispose();document.dispatchEvent(new Event('visibilitychange'));expect(frames.size).toBe(0)
  })
  it('does not emit ready or restart a loop after disposal during model loading',async()=>{
    const s=setup();let resolve!:()=>void
    vi.mocked(s.adapter.initialize).mockImplementation(()=>new Promise(r=>{resolve=r}))
    const starting=s.source.start();s.source.dispose();resolve();await starting
    expect(s.events.some(e=>e.type==='camera.ready')).toBe(false);expect(frames.size).toBe(0)
    expect(s.track.stop).toHaveBeenCalledOnce()
  })
  it('reports model and inference failures and releases the camera',async()=>{
    const s=setup();vi.mocked(s.adapter.initialize).mockRejectedValue(new Error('model unavailable'))
    await s.source.start()
    expect(s.events).toContainEqual(expect.objectContaining({type:'camera.error',code:'model_load_failed'}))
    expect(s.track.stop).toHaveBeenCalledOnce()
    const other=setup();await other.source.start()
    vi.mocked(other.adapter.recognize).mockImplementation(()=>{throw new Error('inference failed')})
    other.tick(0);expect(frames.size).toBe(0);expect(other.track.stop).toHaveBeenCalledOnce()
  })
  it('stops recognition when the camera track ends',async()=>{
    const s=setup();await s.source.start();s.track.dispatchEvent(new Event('ended'))
    expect(s.events).toContainEqual(expect.objectContaining({type:'camera.error',code:'not_readable'}))
    expect(frames.size).toBe(0);expect(s.adapter.close).toHaveBeenCalledOnce()
  })
})

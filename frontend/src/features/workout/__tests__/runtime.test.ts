import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { RealVisionSource } from '../RealVisionSource'
import type { VisionEvent } from '../../../types/vision'
let frames:Map<number,FrameRequestCallback>,id:number
beforeEach(()=>{
 frames=new Map();id=0
 vi.stubGlobal('requestAnimationFrame',vi.fn((fn:FrameRequestCallback)=>{frames.set(++id,fn);return id}))
 vi.stubGlobal('cancelAnimationFrame',vi.fn((id:number)=>frames.delete(id)))
 vi.spyOn(document,'hidden','get').mockReturnValue(false)
 Object.defineProperty(window,'isSecureContext',{value:true,configurable:true})
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
function setup(){
 const track=new EventTarget() as MediaStreamTrack;track.stop=vi.fn()
 const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream
 const getUserMedia=vi.fn().mockResolvedValue(stream)
 Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia},configurable:true})
 const video=document.createElement('video');video.play=vi.fn().mockResolvedValue(undefined)
 Object.defineProperty(video,'readyState',{value:2});Object.defineProperty(video,'currentTime',{value:0,writable:true})
 const gesture=()=>({initialize:vi.fn().mockResolvedValue(undefined),recognize:vi.fn().mockReturnValue(null),close:vi.fn()})
 const hands=[gesture(),gesture(),gesture()],poses=[gesture(),gesture()]
 const handFactory=vi.fn().mockReturnValueOnce(hands[0]).mockReturnValueOnce(hands[1]).mockReturnValueOnce(hands[2]),poseFactory=vi.fn().mockReturnValueOnce(poses[0]).mockReturnValueOnce(poses[1])
 const events:VisionEvent[]=[],raw=vi.fn(),poseRaw=vi.fn()
 const source=new RealVisionSource(video,e=>events.push(e),raw,{gesture:handFactory,pose:poseFactory},poseRaw)
 const tick=(at:number)=>{video.currentTime=at/1000;const [key,fn]=[...frames][0];frames.delete(key);fn(at)}
 return {source,hands,poses,handFactory,poseFactory,events,track,getUserMedia,tick,poseRaw}
}
async function settle(){for(let i=0;i<8;i++)await Promise.resolve()}
it('keeps one stream, closes old models before starting new ones, and one loop across all modes',async()=>{
 const s=setup();await s.source.start();expect(frames.size).toBe(1)
 s.tick(0);s.source.setMode('CALIBRATION');expect(frames.size).toBe(0);expect(s.hands[0].close).toHaveBeenCalledOnce()
 await settle();expect(frames.size).toBe(1);expect(s.poseFactory).toHaveBeenCalledOnce()
 for(const mode of ['COUNTDOWN','WORKOUT','PAUSED','WORKOUT'] as const)s.source.setMode(mode)
 s.tick(1000);expect(s.poses[0].recognize).toHaveBeenCalledOnce();expect(s.poses[0].initialize).toHaveBeenCalledOnce()
 s.source.setMode('RESULTS');await settle();expect(s.poses[0].close).toHaveBeenCalledOnce();expect(s.handFactory).toHaveBeenCalledTimes(2);expect(frames.size).toBe(1)
 expect(s.getUserMedia).toHaveBeenCalledOnce();expect(s.track.stop).not.toHaveBeenCalled()
 s.source.setMode('CALIBRATION');await settle();expect(s.poseFactory).toHaveBeenCalledTimes(2)
 s.source.dispose();expect(frames.size).toBe(0);expect(s.track.stop).toHaveBeenCalledOnce()
 const count=s.events.length;await settle();document.dispatchEvent(new Event('visibilitychange'));expect(s.events).toHaveLength(count)
})
it('serializes late model startup during rapid mode changes and ignores stale callback',async()=>{
 const s=setup();await s.source.start()
 const stale=[...frames.values()][0]
 let resolve!:()=>void;s.poses[0].initialize.mockImplementation(()=>new Promise<void>(r=>{resolve=r}))
 s.source.setMode('CALIBRATION');await settle();s.source.setMode('RESULTS')
 expect(s.poses[0].close).toHaveBeenCalledOnce();expect(s.handFactory).toHaveBeenCalledOnce();expect(frames.size).toBe(0)
 stale(1000);expect(s.hands[0].recognize).not.toHaveBeenCalled()
 resolve();await settle();expect(s.handFactory).toHaveBeenCalledTimes(2);expect(frames.size).toBe(1)
 stale(2000);expect(frames.size).toBe(1);expect(s.hands[1].recognize).not.toHaveBeenCalled()
 s.source.dispose()
})
it('dispose before queued initialization starts avoids creating a model or requesting again',async()=>{
 const s=setup();const pending=s.source.start();s.source.dispose();await pending
 expect(s.handFactory).not.toHaveBeenCalled();expect(s.track.stop).toHaveBeenCalledOnce();expect(frames.size).toBe(0)
})
it('repeat starts and live settings keep one camera, one recognizer and one inference loop',async()=>{
 const s=setup();await Promise.all([s.source.start(),s.source.start()]);for(const sensitivity of [.5,1,1.5,2])s.source.configureInput({sensitivity,smoothingMs:80});s.source.requireNeutralRelease();expect(s.getUserMedia).toHaveBeenCalledOnce();expect(s.handFactory).toHaveBeenCalledOnce();expect(s.hands[0].initialize).toHaveBeenCalledOnce();expect(frames.size).toBe(1);s.source.dispose();s.source.dispose();expect(s.track.stop).toHaveBeenCalledOnce();expect(frames.size).toBe(0)
})

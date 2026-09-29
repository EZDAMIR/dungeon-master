import { afterEach, expect, it, vi } from 'vitest'
import { WorkoutAudio } from '../workoutAudio'
import { buildResult } from '../../vision/exercises/squat/resultBuilder'
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
it('uses semantic speech with Russian voice, cooldown and critical interruption; completion is always spoken',async()=>{
 const synth={getVoices:()=>[{lang:'ru-RU'}],speak:vi.fn(),cancel:vi.fn(),pending:false}
 Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true})
 vi.stubGlobal('SpeechSynthesisUtterance',class {text:string;constructor(text:string){this.text=text}})
 const audio=new WorkoutAudio();await audio.enable()
 audio.event({type:'workout.technique_error',at:4000,code:'depth_insufficient',correction:'Опустись немного ниже',severity:'warning'})
 audio.event({type:'workout.technique_error',at:4050,code:'depth_insufficient',correction:'Опустись немного ниже',severity:'warning'})
 expect(synth.speak).toHaveBeenCalledTimes(1)
 audio.event({type:'pose.tracking_lost',at:5000});expect(synth.cancel).toHaveBeenCalledOnce()
 audio.event({type:'workout.completed',at:5000,result:buildResult([],0)})
 expect(synth.speak.mock.calls.at(-1)?.[0].text).toBe('Тренировка завершена')
 audio.setMuted(true);audio.event({type:'workout.countdown',at:9000,count:0});expect(synth.speak).toHaveBeenCalledTimes(3)
 audio.close()
})
it('speech and tone failures leave semantic handling usable',async()=>{
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>{throw new Error('unavailable')}},configurable:true})
 const audio=new WorkoutAudio();await audio.enable()
 expect(()=>audio.event({type:'workout.countdown',at:1000,count:0})).not.toThrow();audio.close()
})

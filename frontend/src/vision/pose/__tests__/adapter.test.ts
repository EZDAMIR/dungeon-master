import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({files:vi.fn(),create:vi.fn(),detect:vi.fn(),close:vi.fn(),resultClose:vi.fn()}))
vi.mock('@mediapipe/tasks-vision',()=>({FilesetResolver:{forVisionTasks:mocks.files},PoseLandmarker:{createFromOptions:mocks.create}}))
import { MediaPipePoseLandmarker } from '../poseRecognizer'
beforeEach(()=>{vi.resetAllMocks();mocks.files.mockResolvedValue({});mocks.create.mockResolvedValue({detectForVideo:mocks.detect,close:mocks.close})})
it('uses VIDEO/one pose, BASE_URL assets and one CPU fallback; normalizes and closes results',async()=>{
 mocks.create.mockRejectedValueOnce(new Error('GPU unavailable'))
 const adapter=new MediaPipePoseLandmarker();await Promise.all([adapter.initialize(),adapter.initialize()])
 expect(mocks.files).toHaveBeenCalledOnce();expect(mocks.create).toHaveBeenCalledTimes(2)
 expect(mocks.create).toHaveBeenLastCalledWith({},expect.objectContaining({runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:false,baseOptions:expect.objectContaining({modelAssetPath:'/models/pose_landmarker_lite.task',delegate:'CPU'})}))
 mocks.detect.mockReturnValue({landmarks:[Array.from({length:33},()=>({x:.5,y:.4,z:0,visibility:.99}))],close:mocks.resultClose})
 expect(adapter.recognize(document.createElement('video'),120)).toMatchObject({at:120,aspectRatio:1});expect(mocks.resultClose).toHaveBeenCalledOnce()
 adapter.close();adapter.close();expect(mocks.close).toHaveBeenCalledOnce();expect(adapter.recognize(document.createElement('video'),200)).toBeNull()
})
it('closes a late pose model and never returns samples after disposal',async()=>{
 let resolve!:(value:unknown)=>void;mocks.create.mockReturnValue(new Promise(r=>{resolve=r}))
 const adapter=new MediaPipePoseLandmarker(),pending=adapter.initialize();await Promise.resolve();adapter.close();resolve({close:mocks.close});await pending
 expect(mocks.close).toHaveBeenCalledOnce();expect(adapter.recognize(document.createElement('video'),200)).toBeNull()
})

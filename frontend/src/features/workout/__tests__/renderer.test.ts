import { expect, it, vi } from 'vitest'
import { drawPose } from '../poseRenderer'
import { pose } from '../../../../tests/fixtures/pose/builder'
import { LANDMARK } from '../../../vision/pose/landmarks'
it('draws provider-neutral smoothed joints with a single mirror and video letterboxing',()=>{
 const ctx={strokeStyle:'',fillStyle:'',font:'',setTransform:vi.fn(),clearRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),arc:vi.fn(),fill:vi.fn(),fillText:vi.fn()}
 const p=pose(0)
 drawPose(ctx as unknown as CanvasRenderingContext2D,{sample:p,activeSide:'left',fps:20,inferenceMs:10},400,225,640,480)
 const first=p.landmarks[LANDMARK.leftShoulder]
 expect(ctx.moveTo.mock.calls[0][0]).toBeCloseTo(50+(1-first.x)*300)
 expect(ctx.moveTo.mock.calls[0][1]).toBeCloseTo(first.y*225)
 expect(ctx.fillText.mock.calls[0][0]).toBe('178°');expect(ctx.arc).toHaveBeenCalled()
})

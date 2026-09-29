export type Point = { x: number; y: number }
export const clamp = (value: number, min = 0, max = 1) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export const distance2D = distance
export const midpoint = (a:Point,b:Point):Point => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
export function angleDegrees(a:Point,b:Point,c:Point):number {
 const u={x:a.x-b.x,y:a.y-b.y},v={x:c.x-b.x,y:c.y-b.y}
 const length=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y)
 if (!Number.isFinite(length) || length<1e-9) return 0
 return Math.acos(clamp((u.x*v.x+u.y*v.y)/length,-1,1))*180/Math.PI
}
export const angleFromVertical = (top:Point,bottom:Point) => angleDegrees(top,bottom,{x:bottom.x,y:bottom.y-1})
export function median(values:readonly number[]):number {
 const sorted=values.filter(Number.isFinite).toSorted((a,b)=>a-b),n=sorted.length
 return n ? (sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2 : 0
}
export function boundingBox(points:readonly Point[]) {
 return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))}
}
export const normalizedVerticalVelocity = (previous:number,current:number,elapsedMs:number,scale:number) => elapsedMs>0 && scale>0 ? (current-previous)*1000/(elapsedMs*scale) : 0

export const fakeVisionEnabled = (development:boolean,query:string) => development && new URLSearchParams(query).get('fakeVision')==='1'

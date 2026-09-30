export type ApiErrorKind = 'http'|'offline'|'timeout'|'aborted'|'protocol'
export class ApiError extends Error {
  readonly kind:ApiErrorKind
  readonly status:number
  readonly code:string|null
  readonly requestId:string|null
  constructor(kind:ApiErrorKind,status=0,code:string|null=null,requestId:string|null=null) {
    super(kind==='http' ? `API request failed (${status})` : `API ${kind}`)
    this.kind=kind;this.status=status;this.code=code;this.requestId=requestId
    this.name='ApiError'
  }
}
export type RequestOptions = {method?:'GET'|'POST'|'PUT';body?:unknown;token?:string;signal?:AbortSignal}
export class ApiClient {
  private readonly baseUrl:string
  private readonly timeoutMs:number
  private readonly transport:typeof fetch
  constructor(baseUrl=import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',timeoutMs=7000,transport:typeof fetch=(...args)=>fetch(...args)) {this.baseUrl=baseUrl;this.timeoutMs=timeoutMs;this.transport=transport}
  async request<T>(path:string,options:RequestOptions={}):Promise<{data:T|null;requestId:string|null}> {
    const controller=new AbortController()
    let timedOut=false
    const abort=()=>controller.abort()
    if(options.signal?.aborted)abort()
    else options.signal?.addEventListener('abort',abort,{once:true})
    const timer=setTimeout(()=>{timedOut=true;abort()},this.timeoutMs)
    let requestId:string|null=null
    try {
      const response=await this.transport(this.baseUrl.replace(/\/$/,'')+path,{
        method:options.method ?? 'GET',signal:controller.signal,
        headers:{Accept:'application/json',...(options.body!==undefined ? {'Content-Type':'application/json'} : {}),...(options.token ? {Authorization:`Bearer ${options.token}`} : {})},
        body:options.body===undefined ? undefined : JSON.stringify(options.body),
      })
      requestId=response.headers.get('X-Request-ID')
      const text=await response.text()
      let data:unknown=null
      if(text){try {data=JSON.parse(text)} catch {throw new ApiError('protocol',response.status,null,requestId)}}
      if(!response.ok)throw new ApiError('http',response.status,typeof data==='object' && data!==null && 'status' in data && typeof data.status==='string' ? data.status : null,requestId)
      return {data:data as T|null,requestId}
    } catch(error) {
      if(error instanceof ApiError)throw error
      throw new ApiError(timedOut ? 'timeout' : controller.signal.aborted ? 'aborted' : 'offline',0,null,requestId)
    } finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}
  }
  async json<T>(path:string,options:RequestOptions={}):Promise<T> {
    const {data,requestId}=await this.request<T>(path,options)
    if(data===null)throw new ApiError('protocol',200,null,requestId)
    return data
  }
}

import { type SimpleRpcWrapper } from '../simpleRpc'

export type RequestData = Pick<
  Request,
  | 'cache'
  | 'credentials'
  | 'destination'
  | 'integrity'
  | 'keepalive'
  | 'method'
  | 'mode'
  | 'redirect'
  | 'referrer'
  | 'referrerPolicy'
  | 'url'
> & { headers: Record<string, string> }
export type RequestOverrides = Partial<RequestData & { filterBody: boolean }>

export type ResponseData = Pick<
  Response,
  'ok' | 'redirected' | 'status' | 'statusText' | 'type' | 'url'
> & { headers: Record<string, string> }

export type ResponseOverrides = Partial<{
  headers: Record<string, string>
  status: number
  statusText: string
  filterBody: boolean
}>

export type FetchFilter = {
  createFilterInstance(): Promise<SimpleRpcWrapper<FetchFilterInstance>>
}

export type FetchFilterInstance = {
  filterRequest(reqData: RequestData): Promise<RequestOverrides | boolean>
  filterRequestBody(body: ArrayBuffer): Promise<ArrayBuffer | false>
  filterResponse(resData: ResponseData): Promise<ResponseOverrides | boolean>
  filterResponseBody(body: ArrayBuffer): Promise<ArrayBuffer | false>
}

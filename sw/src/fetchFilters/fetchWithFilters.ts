import { type SimpleRpcWrapper, SimpleRpc } from '../simpleRpc'
import type { FetchFilterInstance, RequestData, ResponseData } from './types'

function toRequestData(req: Request): RequestData {
  const {
    cache,
    credentials,
    destination,
    headers,
    integrity,
    keepalive,
    method,
    mode,
    redirect,
    referrer,
    referrerPolicy,
    url,
  } = req
  return {
    cache,
    credentials,
    destination,
    headers: Object.fromEntries(headers.entries()),
    integrity,
    keepalive,
    method,
    mode,
    redirect,
    referrer,
    referrerPolicy,
    url,
  }
}

function toResponseData(res: Response): ResponseData {
  const { headers, ok, redirected, status, statusText, type, url } = res
  return {
    headers: Object.fromEntries(headers.entries()),
    ok,
    redirected,
    status,
    statusText,
    type,
    url,
  }
}

export async function fetchWithFilters(
  req: Request,
  filters: SimpleRpcWrapper<FetchFilterInstance>[],
): Promise<Response> {
  const filter = filters.shift()
  if (!filter) return await fetch(req)

  const reqOverrides = await SimpleRpc.call(filter, 'filterRequest', req.signal, toRequestData(req))
  if (reqOverrides === false) return Response.error()
  if (typeof reqOverrides === 'object' && reqOverrides !== null) {
    const shouldFilterReqBody = !['GET', 'HEAD'].includes(req.method) && reqOverrides.filterBody
    const reqBody =
      shouldFilterReqBody &&
      (await SimpleRpc.call(filter, 'filterRequestBody', req.signal, await req.arrayBuffer()))
    if (shouldFilterReqBody && reqBody === false) return Response.error()
    req = new Request(req, {
      ...{
        ...reqOverrides,
        filterBody: undefined,
        body: reqBody || undefined,
      },
    })
  }
  let res = await fetchWithFilters(req, filters)
  const resOverrides = await SimpleRpc.call(
    filter,
    'filterResponse',
    req.signal,
    toResponseData(res),
  )
  if (resOverrides === false) return Response.error()
  if (typeof resOverrides === 'object' && reqOverrides !== null) {
    const resBodyOrig = await res.arrayBuffer()
    const resBody = resOverrides.filterBody
      ? await SimpleRpc.call(filter, 'filterResponseBody', req.signal, resBodyOrig)
      : resBodyOrig
    if (resBody === false) return Response.error()
    res = new Response(resBody, {
      headers: resOverrides.headers ?? res.headers,
      status: resOverrides.status ?? res.status,
      statusText: resOverrides.statusText ?? res.statusText,
    })
  }
  return res
}

import { logger } from 'lib/logger'

import { PendoAjaxError } from './errors'
import { filterRequest, filterResponse } from './filters'
import type { PendoEnv } from './types'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'Agent', 'Ajax'] })

function getTransmissionData(this: PendoEnv, url: URL, body: BodyInit | undefined) {
  const jzb = url.searchParams.get('jzb')
  if (jzb !== null) {
    if (body) {
      moduleLogger.error({ url, jzb, body }, `agent tried to send both jzb and post data at once`)
      throw new PendoAjaxError()
    }
    const out = this.compressMap.get(jzb)
    if (!out) {
      moduleLogger.error({ url, jzb }, `agent tried to send jzb data missing from the compressMap`)
      throw new PendoAjaxError()
    }
    return out
  }
  if (body) {
    if (typeof body !== 'string') {
      moduleLogger.error({ url, body }, `agent tried to send non-string POST data`)
      throw new PendoAjaxError()
    }
    return JSON.parse(body)
  }
}

async function filteredFetch(this: PendoEnv, url: string, init?: RequestInit): Promise<Response> {
  const urlObj = new URL(url)
  const dataObj = getTransmissionData.call(this, urlObj, init?.body ?? undefined)

  // Don't report agent errors because we probably caused them ourselves.
  if (dataObj?.error) {
    moduleLogger.warn({ error: dataObj.error }, `suppressed error report from agent`)
    return Promise.resolve(new Response(null, { status: 200 }))
  }

  // Throw if fetch isn't allowed.
  try {
    filterRequest.call(this, urlObj, dataObj, init?.integrity)
  } catch (e) {
    if (this.sealed) {
      moduleLogger.error(e, 'fetch failed filters')
      return Response.error()
    } else {
      moduleLogger.warn(
        e,
        { url, init },
        'fetch failed filters, but proceeding because the environment has been unsealed',
      )
    }
  }

  const res = await fetch(url, init)
  try {
    return filterResponse.call(this, urlObj, dataObj, res.clone())
  } catch (e) {
    if (this.sealed) {
      moduleLogger.error(e, 'response failed filters')
      return Response.error()
    } else {
      moduleLogger.warn(
        e,
        { url, init },
        'response failed filters, but proceeding because the environment has been unsealed',
      )
    }
    return res
  }
}

/** This adapts the pendo.ajax() interface into a standard fetch() call. */
export async function filteredAjax(
  this: PendoEnv,
  params: {
    url: string
    method?: string
    data?: string
    headers?: Record<string, string>
    withCredentials?: boolean
  },
): Promise<{ status: number; data?: string }> {
  const integrity = new URL(params.url).searchParams.get('sha256')
  const res = await filteredFetch.call(this, params.url, {
    method: params.method || 'GET',
    body: params.data || undefined,
    headers: new Headers(params.headers),
    credentials: params.withCredentials ? 'same-origin' : 'omit',
    integrity: integrity ? `sha256-${integrity}` : undefined,
  })
  const rawData = res.body ? await res.text() : undefined
  const data =
    rawData !== undefined
      ? (() => {
          try {
            return JSON.parse(rawData)
          } catch {
            return rawData
          }
        })()
      : undefined
  return {
    status: res.status,
    data,
  }
}
Object.freeze(filteredAjax)

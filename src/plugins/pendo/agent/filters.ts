import { logger } from 'lib/logger'

import { PendoGuideFilterError, PendoGuideRequestError, PendoGuideResponseError } from './errors'
import type { PendoEnv } from './types'

export const expectedResponseKeys = [
  'autoOrdering',
  'designerEnabled',
  'features',
  'globalJsUrl',
  'guideCssUrl',
  'guideWidget',
  'guides',
  'lastGuideStepSeen',
  'normalizedUrl',
  'preventCodeInjection',
  'segmentFlags',
  'throttling',
  'props',
  'type',
  'children',
  'latestDismissedAutoAt',
]

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'Agent', 'Filters'] })

export function filterGuideTag(
  this: PendoEnv,
  tagName: string,
  attributes: Record<string, string>,
) {
  moduleLogger.trace({ fn: 'filterGuideTag', tagName, attributes }, 'filtering guide tag')
  tagName = tagName.toLowerCase().trim()
  attributes = Object.fromEntries(
    Object.entries(attributes).map(([k, v]) => [k.toLowerCase().trim(), v]),
  )
  switch (tagName) {
    case 'embed':
    case 'iframe':
    case 'script':
      moduleLogger.error({ tagName, attributes }, 'tag not allowed in guides')
      throw new PendoGuideFilterError()
    case 'a':
      if (attributes.href && /^\s*javascript:/i.test(attributes.href)) {
        moduleLogger.error({ tagName, attributes }, `guides may not contain 'javascript:' links`)
        throw new PendoGuideFilterError()
      }
      break
    default:
      return
  }
}

export function filterRequest(
  this: PendoEnv,
  url: URL,
  data: object | undefined,
  integrity: string | undefined,
) {
  // This is excessively paranoid, but it limits the data leakage possible to a 1-byte
  // range of values. (Actual values are in the single digits.)
  const ctEpsilon = 128
  const dataHost = this.PendoConfig.dataHost
  const guideHosts = ((this.PendoConfig.allowedOriginServers as string[]) ?? []).map(
    x => new URL(x).host,
  )

  if (url.protocol !== 'https:') {
    moduleLogger.error({ url }, `fetch to non-https url not allowed`)
    throw new PendoGuideRequestError()
  }
  // This is all a bit overly restrictive, but it should ensure we fail fast if
  // any of the assumptions made are incorrect.
  if (dataHost && url.host === dataHost) {
    const [match, endpoint, apiKey] = /^\/data\/([^/]*)\/(.*)$/.exec(url.pathname) ?? []
    if (!match) {
      moduleLogger.error({ url }, `fetch from data.pendo.io does not match expected regex`)
      throw new PendoGuideRequestError()
    }
    const expectedApiKey = this.PendoConfig.apiKey
    if (apiKey !== expectedApiKey) {
      moduleLogger.error(
        { apiKey, expectedApiKey },
        `api key in url which does not match agent configuration`,
      )
      throw new PendoGuideRequestError()
    }
    // Verify no unexpected data in the URL parameters
    for (const [k, v] of url.searchParams.entries()) {
      switch (k) {
        // allow 'track' events
        case 'type':
          const expectedV = 'track'
          if (v !== expectedV) {
            moduleLogger.error({ v, expectedV }, `url parameter ${k} with unexpected value ${v}`)
          }
          break
        case 'jzb':
          break
        case 'v': {
          const expectedV = this.pendo.VERSION
          if (v !== expectedV) {
            moduleLogger.error(
              { v, expectedV },
              `url parameter 'v' which does not match agent version`,
            )
            throw new PendoGuideRequestError()
          }
          break
        }
        case 'ct': {
          const ct = Number.parseInt(v)
          const now = Date.now()
          if (
            !Number.isSafeInteger(ct) ||
            ct.toString() !== v ||
            Math.abs(ct - Date.now()) > ctEpsilon
          ) {
            moduleLogger.error(
              { ct, now, ctEpsilon },
              `url parameter 'ct' outside of expected range`,
            )
            throw new PendoGuideRequestError()
          }
          break
        }
        default:
          moduleLogger.error({ url, key: k, value: v }, 'unexpected url parameter')
          throw new PendoGuideRequestError()
      }
    }
    // Log the transmission
    const transmissions = (Array.isArray(data) ? data : [data]).map(x => ({
      endpoint,
      ...x,
    }))
    for (const transmission of transmissions) {
      this.transmissionLog.push(transmission)
    }
  } else if (guideHosts.includes(url.host)) {
    if (!/^\/guide-content\/.*\.dom\.json$/.test(url.pathname)) {
      moduleLogger.error({ url }, 'fetch from guide host does not appear to be for a guide')
      throw new PendoGuideRequestError()
    }
    // Verify no unexpected data in the URL parameters
    let sawIntegrity = false
    for (const [k, v] of url.searchParams.entries()) {
      switch (k) {
        case 'sha256': {
          const expectedIntegrity = `sha256-${v}`
          if (integrity !== expectedIntegrity) {
            moduleLogger.error(
              { integrity, expectedIntegrity },
              `SRI url parameter does not match request's integrity value`,
            )
            throw new PendoGuideRequestError()
          }
          sawIntegrity = true
          break
        }
        default:
          moduleLogger.error({ url, key: k, value: v }, 'unexpected url parameter')
          throw new PendoGuideRequestError()
      }
    }
    if (!sawIntegrity) {
      moduleLogger.error({ url }, 'no SRI parameter in URL')
      throw new PendoGuideRequestError()
    }
  } else {
    moduleLogger.error({ url }, 'unrecognized URL')
    throw new PendoGuideRequestError()
  }
}

export async function filterResponse(
  this: PendoEnv,
  _url: URL,
  _data: object | undefined,
  response: Response,
): Promise<Response> {
  if (response.status < 200 || response.status >= 300) return Response.error()
  if (!response.body || response.headers.get('Content-Type') === 'image/gif') {
    return new Response(null, { status: 200 })
  }
  const resBuf = await response.arrayBuffer()
  const resObj = (() => {
    try {
      return JSON.parse(new TextDecoder().decode(resBuf))
    } catch {
      return undefined
    }
  })()
  if (resObj === undefined) {
    moduleLogger.error({ response: resBuf }, 'response was not parsable as JSON')
    throw new PendoGuideFilterError()
  }
  if (Array.isArray(resObj)) {
    moduleLogger.error({ response: resObj }, 'response is an array, not an object')
    throw new PendoGuideFilterError()
  }
  // The pendo agent just assigns any returned object's keys to the global window.pendo
  // object, so we need to make sure a malicious server can't bust anything that way.
  // This method is super janky, but good enough, and will fail fast.
  const unexpectedKeys = Object.keys(resObj).filter(x => !expectedResponseKeys.includes(x))
  if (unexpectedKeys.length > 0) {
    moduleLogger.warn({ unexpectedKeys }, `response has unexpected keys`)
    for (const unexpectedKey of unexpectedKeys) {
      if (unexpectedKey in this.pendo) {
        moduleLogger.error(
          { unexpectedKey },
          'unexpected key in response would clobber an existing value',
        )
        throw new PendoGuideResponseError()
      }
    }
  }
  // Override preventCodeInjection to true in case the server feels like trying
  // to unset it
  if ('guides' in resObj || 'preventCodeInjection' in resObj) {
    if (resObj.preventCodeInjection !== true) {
      moduleLogger.warn(
        `PendoEnv: Expected preventCodeInjection to be set on a guide, but it wasn't. It's been set anyway.`,
      )
    }
    resObj.preventCodeInjection = true
  }
  // The agent doesn't use headers or statusText, so we can ignore them
  return new Response(JSON.stringify(resObj), {
    status: response.status,
  })
}

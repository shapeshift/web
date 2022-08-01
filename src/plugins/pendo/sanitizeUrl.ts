import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo'] })

const sanitizedUrls = new Map<string, string>()
const SANITIZED_URLS_MAX = 100
const SANITIZED_URLS_PRUNE_DELAY_MS = 60 * 1000

let sanitizedUrlsPruneTimeout: ReturnType<typeof setTimeout> | undefined = undefined

function pruneSanitizedUrls() {
  sanitizedUrlsPruneTimeout = undefined
  const excessItemCount = sanitizedUrls.size - SANITIZED_URLS_MAX
  if (excessItemCount <= 0) return
  for (let i = 0; i < excessItemCount; i++) {
    const firstKey = sanitizedUrls.keys().next().value
    sanitizedUrls.delete(firstKey)
  }
}

function pruneSanitizedUrlsLater() {
  if (sanitizedUrlsPruneTimeout === undefined) return
  sanitizedUrlsPruneTimeout = setTimeout(pruneSanitizedUrls, SANITIZED_URLS_PRUNE_DELAY_MS)
}

function sanitizeUrlObject(url: URL): URL {
  if (url.origin !== window.location.origin) {
    url.pathname = url.pathname.replace(/(^|\/)[^/]{20,}(?=\/|$)/g, '$1***')
    url.hash = ''
  } else {
    url.hash = url.hash.replace(
      /(\/accounts\/[-a-z0-9]{3,8}:[-a-zA-Z0-9]{1,32}):[^/]*(\/.*)?$/i,
      '$1:***$2',
    )
  }
  return url
}

function sanitizeUrlInner(x: string): string {
  const [url, returnHashOnly, returnRelativeOnly] = (() => {
    if (/^#/.test(x)) {
      const out = new URL(window.location.href)
      out.hash = x
      return [out, true, false]
    } else {
      const result = /^(\/[^#]*)(#.*)?/.exec(x)
      if (result) {
        const out = new URL(window.location.href)
        out.pathname = result[1]
        out.hash = result[2]
        return [out, false, true]
      }
    }
    return [new URL(x), false, false]
  })()
  const out = sanitizeUrlObject(url)
  moduleLogger.trace({ fn: 'sanitizeUrlInner', url: x, out: out.toString() }, 'sanitized URL')
  if (returnHashOnly) return out.hash
  if (returnRelativeOnly) return `${out.pathname}${out.hash}`
  return out.toString()
}

export function sanitizeUrl(x: string): string {
  let out = sanitizedUrls.get(x)
  if (out) {
    // Removing and re-adding the item to make sure it's last in insertion order
    // so it won't be dropped when pruning the cache
    sanitizedUrls.delete(x)
    sanitizedUrls.set(x, out)
    return out
  }
  out = (() => {
    try {
      return sanitizeUrlInner(x)
    } catch (e) {
      moduleLogger.error(e, { fn: 'sanitizeUrl', url: x }, 'error sanitizing URL')
      return undefined
    }
  })()
  if (out === undefined) return ''
  sanitizedUrls.set(x, out)
  pruneSanitizedUrlsLater()
  return out
}

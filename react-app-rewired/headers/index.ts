import 'dotenv/config'

import type { Csp } from './types'
import { collectCsps, cspMerge, serializeCsp } from './util'

export { serializeCsp } from './util'

/**
 * Some CSP directives are ineffective (and cause spurious console errors) if
 * delivered via meta tag. This group of directives will only be delivered via
 * the _headers file.
 */
export const cspHeader: Csp = {
  'frame-ancestors': ["'none'"],
  // 'report-uri': ['https://shapeshift.report-uri.com/r/d/csp/wizard'],
}

/**
 * These directives will be delivered by the meta tag alone.
 */
export const cspMeta = cspMerge(
  ...collectCsps('./csps'),
  'report-uri' in cspHeader
    ? {
        'script-src': ["'report-sample'"],
        'style-src': ["'report-sample'"],
      }
    : {},
)

const baseHeaders: Record<string, string> = {
  'Cache-Control': 'no-transform', // This will prevent middleboxes from munging our JS and breaking SRI if we're ever served over HTTP.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'document-domain=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

function makeHeaders(...csps: Csp[]): Record<string, string> {
  return {
    ...baseHeaders,
    'Content-Security-Policy': `${serializeCsp(cspMerge(...csps))}`,
  }
}

function makeCypressHeaders(...csps: Csp[]): Record<string, string> {
  return {
    ...baseHeaders,
    'Content-Security-Policy': `${serializeCsp(
      cspMerge(...csps, {
        'frame-ancestors': ["'self'"],
      }),
    )}`,
    'Permissions-Policy': 'document-domain=(self)',
  }
}

const useCypressRelaxedSecurity = process.env.CYPRESS_RELAXED_SECURITY === 'true'

export const headers = (useCypressRelaxedSecurity ? makeCypressHeaders : makeHeaders)(cspHeader)

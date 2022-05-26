const fs = require('fs')
require('dotenv').config()

/** @typedef {Record<string, Array<string>>} CspBase */
/** @typedef {[string, string]} CspEntry */

/**
 * @param {CspBase} x
 * @returns {CspEntry[]}
 */
function cspToEntries(x) {
  return Object.entries(x).flatMap(([k, v]) => {
    return v.map(entry => {
      /** @type {[string, string]} */
      const out = [k, entry]
      return out
    })
  })
}

/**
 * @param {CspEntry[]} x
 * @returns {CspBase}
 */
function entriesToCsp(x) {
  /** @type {CspBase} */
  const acc = {}
  return x
    .sort(([k1, v1], [k2, v2]) => {
      if (k1 < k2) return -1
      if (k1 > k2) return 1
      if (v1 < v2) return -1
      if (v1 > v2) return 1
      return 0
    })
    .reduce((a, [k, v]) => {
      a[k] ??= []
      if (v && (a[k].length === 0 || v !== "'none'") && !a[k].includes(v)) a[k].push(v)
      if (a[k].length > 1) a[k] = a[k].filter(x => x !== "'none'")
      return a
    }, acc)
}

/**
 * @param  {...CspBase[]} args
 * @returns {CspBase}
 */
function cspMerge(...args) {
  return entriesToCsp(args.flatMap(x => cspToEntries(x)))
}

/**
 * @param {CspBase} x
 * @returns {string}
 */
function serializeCsp(x) {
  return Object.entries(x)
    .map(([k, v]) => [k, v.filter(x => !!x)])
    .map(([k, v]) => `${[k, ...v].join(' ')}`)
    .join('; ')
}

/**
 * Recursively collects partial CSPs exported by scripts in a certain directory.
 * @param {string} dir Path to the directory to search.
 * @returns {CspBase[]}
 */
function collectPartialCsps(dir) {
  const out = []
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const itemPath = `${dir}/${item.name}`
    if (item.isDirectory()) {
      out.push(...collectPartialCsps(itemPath))
    } else {
      if (!item.isFile() || !/\.js$/.test(item.name)) continue
      console.info(`using partial CSP from ${itemPath}`)
      out.push(require(itemPath))
    }
  }
  return out
}

/**
 * Some CSP directives are ineffective (and cause spurious console errors) if
 * delivered via meta tag. This group of directives will only be delivered via
 * the _headers file.
 * @type {CspBase}
 */
const cspHeader = {
  'frame-ancestors': ["'none'"],
  // 'report-uri': ['https://shapeshift.report-uri.com/r/d/csp/wizard'],
}

/**
 * These directives will be delivered by the meta tag alone.
 * @type {CspBase}
 */
const cspMeta = cspMerge(
  ...collectPartialCsps('./partialCsps'),
  'report-uri' in cspHeader
    ? {
        'script-src': ["'report-sample'"],
        'style-src': ["'report-sample'"],
      }
    : {},
)

console.info('Header CSP:', cspHeader)
console.info('Meta CSP:', cspMeta)

/** @type { Record<string, string> } */
const baseHeaders = {
  'Cache-Control': 'no-transform', // This will prevent middleboxes from munging our JS and breaking SRI if we're ever served over HTTP.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'document-domain=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

/** @param {...CspBase[]} */
const makeHeaders = (...csps) => ({
  ...baseHeaders,
  'Content-Security-Policy': `${serializeCsp(cspMerge(...csps))}`,
})

/** @param {...CspBase[]} */
const makeCypressHeaders = (...csps) => ({
  ...baseHeaders,
  'Content-Security-Policy': `${serializeCsp(
    cspMerge(...csps, {
      'frame-ancestors': ["'self'"],
    }),
  )}`,
  'Permissions-Policy': 'document-domain=(self)',
})

const useCypressRelaxedSecurity = process.env.CYPRESS_RELAXED_SECURITY === 'true'

const headers = (useCypressRelaxedSecurity ? makeCypressHeaders : makeHeaders)(cspHeader)

module.exports = {
  headers,
  cspMeta: serializeCsp(cspMeta),
}

if (!module.parent) {
  require('fs').writeFileSync(
    './build/_headers',
    `/*\n${Object.entries(headers)
      .map(([k, v]) => `  ${k}: ${v}\n`)
      .join('')}`,
  )
}

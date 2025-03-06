import type { Csp, CspEntry } from './types'

/**
 * Splits a CSP object into a list of [directive, source] entries.
 */
export function cspToEntries(x: Csp): CspEntry[] {
  return Object.entries(x).flatMap(([k, v]) => {
    return v.map(entry => {
      const out = [k, entry]
      return out
    })
  })
}

/**
 * Collects a list of [directive, source] entries into a CSP object. Filters out
 * the 'none' source if any other sources are present, and returns the result in
 * sorted form.
 */
export function entriesToCsp(x: CspEntry[]): Csp {
  const acc: Csp = {}
  return x
    .sort(([k1, v1], [k2, v2]) => {
      if (k1 === undefined || k2 === undefined) return 0
      if (v1 === undefined || v2 === undefined) return 0

      if (k1 < k2) return -1
      if (k1 > k2) return 1
      if (v1 < v2) return -1
      if (v1 > v2) return 1
      return 0
    })
    .reduce((a, [k, v]) => {
      if (!k) return a

      a[k] ??= []
      if (v && (a[k].length === 0 || v !== "'none'") && !a[k].includes(v)) a[k].push(v)
      if (a[k].length > 1) a[k] = a[k].filter(x => x !== "'none'")
      return a
    }, acc)
}

/**
 * Produces a CSP that allows the union of the set of things allowed by the source
 * CSPs. (Applying multiple CSPs, on the other hand, will enforce their intersection.)
 */
export function cspMerge(...args: Csp[]): Csp {
  return entriesToCsp(args.flatMap(x => cspToEntries(x)))
}

/**
 * Serializes a CSP object to the format which the browser will process.
 */
export function serializeCsp(x: Csp): string {
  return Object.entries(x)
    .map(([k, v]) => [k, v.filter(x => !!x)])
    .map(([k, v]) => `${[k, ...v].join(' ')}`)
    .join('; ')
}

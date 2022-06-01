import * as fs from 'fs'
import * as path from 'path'

import type { Csp, CspEntry } from './types'

/**
 * Splits a CSP object into a list of [directive, source] entries.
 */
export function cspToEntries(x: Csp): CspEntry[] {
  return Object.entries(x).flatMap(([k, v]) => {
    return v.map(entry => {
      const out: [string, string] = [k, entry]
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

/**
 * Recursively collects all the CSPs exported by scripts in a certain directory.
 * @param dir Path to the directory to search.
 */
export function collectCsps(dir: string): Csp[] {
  const out = []
  for (const item of fs.readdirSync(path.resolve(__dirname, dir), { withFileTypes: true })) {
    const itemPath = `${dir}/${item.name}`
    if (item.isDirectory()) {
      out.push(...collectCsps(itemPath))
    } else {
      if (!item.isFile() || !/\.(j|t)s$/.test(item.name)) continue
      const csp = require(itemPath).csp
      if (!csp) throw new Error(`expected ${itemPath} to export a member named 'csp'`)
      console.info(`using CSP from ${itemPath}`)
      out.push(csp)
    }
  }
  return out
}

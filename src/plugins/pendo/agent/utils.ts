/**
 * Serializes an object as JSON with support for regular expressions. RegExps
 * are encoded as strings with a particular prefix (regexCookie) containing a
 * "regexp literal" representation. The prefix chosen can be the empty string,
 * which will parse any string that looks like a RegExp into one, or can be an
 * unpredicable string like a UUID to avoid collisions.
 */
export class JSONWithRegex {
  regexCookie: string
  constructor(regexCookie = '') {
    this.regexCookie = regexCookie
  }
  parse(x: string): unknown {
    return JSON.parse(x, (_k, v) => {
      if (typeof v === 'string' && v.startsWith(this.regexCookie)) {
        const vRight = v.slice(this.regexCookie.length)
        const result = /^\/(.*)\/[a-z]*$/.exec(vRight)
        if (!result) {
          if (this.regexCookie.length > 0) {
            throw new Error(`matched regexCookie, but ${vRight} is not a regex`)
          }
          return v
        }
        return new RegExp(result[1], result[2])
      }
      return v
    })
  }
  stringify(x: unknown) {
    return JSON.stringify(x, (_k, v) => {
      if (v instanceof RegExp) {
        return `${this.regexCookie}${v.toString()}`
      }
      return v
    })
  }
}

/**
 * Applies a set of fixups to a string. Fixups are strings to insert at specific
 * indexes into the source string. (Fixups' indexes are all positions in the source
 * string, and are not affected by changes associated with other fixups in the set.)
 * @param src A source string.
 * @param fixups An object whose entries are tuples of a character-index into
 * `src` and a string to insert after that point.
 * @returns The string, with the fixups inserted at the specificed points.
 */
export function applyFixups(src: string, fixups: Record<number, string>): string {
  const fixupIndexes = Object.keys(fixups)
    .map(x => parseInt(x))
    .filter(x => Number.isSafeInteger(x) && x >= 0)
    .sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
  const agentSegments = (() => {
    let leftover = src
    let lastIndex = 0
    const out: string[] = []
    for (const index of fixupIndexes) {
      const charsSinceLast = index - lastIndex
      lastIndex = index
      if (charsSinceLast > leftover.length) {
        throw new Error(
          `applyFixups: fixup index ${charsSinceLast} exceeds length of source string (${src.length})`,
        )
      }
      out.push(leftover.slice(0, charsSinceLast))
      leftover = leftover.slice(charsSinceLast)
    }
    out.push(leftover)
    return out
  })()
  const fixupPayloads = fixupIndexes.map(x => fixups[x])
  const fixedUpSegments = fixupPayloads.reduce<string[]>((a, x) => {
    const segment = agentSegments.shift()
    if (segment === undefined) throw new Error('applyFixups: expected segment for fixup')
    a.push(segment)
    a.push(x)
    return a
  }, [])
  if (agentSegments.length !== 1) {
    throw new Error('applyFixups: expected exactly one leftover segment')
  }
  fixedUpSegments.push(agentSegments[0])
  return fixedUpSegments.join('')
}

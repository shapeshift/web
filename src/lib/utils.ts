import difference from 'lodash/difference'
import intersection from 'lodash/intersection'

// we don't want utils to mutate by default, so spreading here is ok
export const upsertArray = <T extends unknown>(arr: T[], item: T): T[] =>
  arr.includes(item) ? arr : [...arr, item]

export const isEthAddress = (address: string) => {
  return /^0x[0-9A-Fa-f]{40}$/.test(address)
}

export const markdownLinkToHTML = (markdown: string): string => {
  return markdown.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

/**
 * Compare two arrays and return them partitioned into "add", "remove" and "keep"
 *
 * Use this to compare an existing state against a desired state
 *
 * @param first - Anything in this array but not the second will be in "remove"
 * @param second - Anything in this array but not in the first will be in "add"
 */
export function partitionCompare<T>(first: T[], second: T[]) {
  return {
    remove: difference<T>(first, second),
    keep: intersection<T>(first, second),
    add: difference<T>(second, first),
  }
}

/**
 * Compare two arrays and call an "add" or "remove" function
 *
 * @param first - Anything in this array but not the second will be removed
 * @param second - Anything in this array but not in the first will be added
 * @param fns - functions to run when an item should be added or removed
 */
export function partitionCompareWith<T>(
  first: T[],
  second: T[],
  fns: { add: (item: T) => void; remove: (item: T) => void },
) {
  const result = partitionCompare(first, second)

  result.add.forEach(i => fns.add(i))
  result.remove.forEach(i => fns.remove(i))

  return result
}

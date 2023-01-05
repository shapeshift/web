import type { AssetReference } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { isNull } from 'lodash'
import difference from 'lodash/difference'
import intersection from 'lodash/intersection'
import isUndefined from 'lodash/isUndefined'
import union from 'lodash/union'

// we don't want utils to mutate by default, so spreading here is ok
export const upsertArray = <T extends unknown>(arr: T[], item: T): T[] =>
  arr.includes(item) ? arr : [...arr, item]

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

export const isToken = (assetReference: AssetReference | string) => {
  return !(
    Object.values(ASSET_REFERENCE).includes(assetReference as AssetReference) ||
    isOsmosisLpAsset(assetReference)
  )
}

export const isOsmosisLpAsset = (assetReference: AssetReference | string): boolean => {
  return assetReference.startsWith('gamm/pool/')
}

export const tokenOrUndefined = (assetReference: AssetReference | string) =>
  isToken(assetReference) ? assetReference : undefined

export const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

// 0 is valid but falsy, dum language
export const isValidAccountNumber = (
  accountNumber: number | undefined | null,
): accountNumber is number => {
  if (accountNumber === undefined) return false
  if (accountNumber === null) return false
  return Number.isInteger(accountNumber) && accountNumber >= 0
}

export type PartialRecord<K extends keyof any, V> = Partial<Record<K, V>>

export const walletCanEditMemo = (wallet: HDWallet): boolean => {
  switch (true) {
    case wallet instanceof KeepKeyHDWallet:
    case wallet instanceof NativeHDWallet:
      return false
    case wallet instanceof KeplrHDWallet:
    default:
      return true
  }
}

export type NestedArray<T> = PartialRecord<keyof any, PartialRecord<keyof any, T[]>>

/**
 * @param data - Partial, two level nested object with array of strings at leaf
 * @param level1Key - The key into the first level of the nested object
 * @param level2Key - The key into the second level of the nested object
 * @param value - The value to union into the deep array
 *
 * @returns void - this function mutates data!
 */
export const deepUpsertArray = <T>(
  data: NestedArray<T>,
  level1Key: keyof any,
  level2Key: keyof any,
  value: T,
): void => {
  let level1 = data[level1Key]
  if (!level1) level1 = data[level1Key] = {}
  level1[level2Key] = union(level1[level2Key] ?? [], [value])
}

export const getTypeGuardAssertion =
  <T, U>(typeGuard: (maybeT: T | U) => maybeT is T, message: string) =>
  (value: T | U): asserts value is T => {
    if (!typeGuard(value)) throw new Error(`${message}: ${value}`)
  }

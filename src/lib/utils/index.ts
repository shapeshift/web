import { skipToken } from '@reduxjs/toolkit/dist/query'
import type { AssetId, AssetReference, ChainId, ChainNamespace } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import type { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import type { WalletConnectV2HDWallet } from '@shapeshiftoss/hdwallet-walletconnectv2'
import type { NestedArray } from '@shapeshiftoss/types'
import { HistoryTimeframe, KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import crypto from 'crypto-browserify'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { isNull, orderBy } from 'lodash'
import difference from 'lodash/difference'
import intersection from 'lodash/intersection'
import isUndefined from 'lodash/isUndefined'
import union from 'lodash/union'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

export const firstFourLastFour = (address: string): string =>
  `${address.slice(0, 6)}...${address.slice(-4)}`

export const trimWithEndEllipsis = (content?: string, trimmedContentLength?: number): string => {
  if (!content) return ''

  if (!trimmedContentLength) return content

  if (content.length < trimmedContentLength) return content

  return content.slice(0, trimmedContentLength).concat('...')
}

export const isKeepKeyHDWallet = (wallet: HDWallet): wallet is KeepKeyHDWallet => {
  return wallet.getVendor() === 'KeepKey'
}

export const isKeplrHDWallet = (wallet: HDWallet): wallet is KeplrHDWallet => {
  return wallet.getVendor() === 'Keplr'
}

export const isNativeHDWallet = (wallet: HDWallet): wallet is NativeHDWallet => {
  return wallet.getVendor() === 'Native'
}

export const isWalletConnectWallet = (wallet: HDWallet): wallet is WalletConnectV2HDWallet => {
  return wallet.getVendor() === 'WalletConnectV2'
}

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

export const middleEllipsis = (value: string): string =>
  value.length >= 12 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value

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
  return !Object.values(ASSET_REFERENCE).includes(assetReference as AssetReference)
}

export const tokenOrUndefined = (assetReference: AssetReference | string) =>
  isToken(assetReference) ? assetReference : undefined

export const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

export const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.length > 0

// export const isTruthy = <T>(value: T | false): value is T => Boolean(value)

type Falsy = false | null | undefined | '' | 0
export const isTruthy = <T>(value: T | Falsy): value is T => Boolean(value)

export const walletCanEditMemo = (wallet: HDWallet): boolean => {
  switch (true) {
    case isKeepKeyHDWallet(wallet):
    case isNativeHDWallet(wallet):
      return false
    case isKeplrHDWallet(wallet):
    default:
      return true
  }
}

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

export const isFulfilled = <T>(
  promise: PromiseSettledResult<T>,
): promise is PromiseFulfilledResult<T> => promise.status === 'fulfilled'

export const isRejected = <T>(promise: PromiseSettledResult<T>): promise is PromiseRejectedResult =>
  promise.status === 'rejected'

export const isResolvedErr = <U, V, T extends Result<U, V>>(
  promise: PromiseSettledResult<T>,
): promise is PromiseRejectedResult => 'value' in promise && promise.value.isErr()

export const setTimeoutAsync = (waitMs: number) =>
  new Promise(resolve => setTimeout(resolve, waitMs))

export function assertUnreachable(x: never): never {
  throw Error(`unhandled case: ${x}`)
}

export function assertIsDefined<T>(x: T | undefined | null): asserts x is T {
  if (x === undefined || x === null) throw Error(`unexpected undefined or null`)
}

/**
 * https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0?permalink_comment_id=4261728#gistcomment-4261728
 * only used to anonymize user data - don't use for anything security critical
 */
export const hashCode = (str: string): string =>
  str
    .split('')
    .reduce((s, c = '') => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString()

export const sha256 = (input: string): string =>
  crypto.createHash('sha256').update(input).digest('hex')

// Predicates, to be used with myzod's `withPredicate`, or without if you feel like it

export const isNonEmpty = (x: string | any[] | Set<any>) => {
  // Array.prototype.length || String.prototype.length for arrays and strings
  if (typeof x === 'string' || Array.isArray(x)) {
    return Boolean(x.length)
  }
  // Set.prototype.size for sets
  if (x instanceof Set) {
    return Boolean(x.size)
  }
  return false
}
export const isUrl = (x: string) => {
  try {
    new URL(x)
    return true
  } catch {
    return false
  }
}

export const isSkipToken = (maybeSkipToken: unknown): maybeSkipToken is typeof skipToken =>
  maybeSkipToken === skipToken

export const getSupportedChainIdsByChainNamespace = () => {
  return Array.from(getChainAdapterManager().keys()).reduce<
    Record<ChainNamespace, KnownChainIds[]>
  >(
    (acc, chainId) => {
      const { chainNamespace } = fromChainId(chainId)
      if (!acc[chainNamespace]) acc[chainNamespace] = []
      acc[chainNamespace].push(chainId as KnownChainIds)
      return acc
    },
    {} as Record<ChainNamespace, KnownChainIds[]>,
  )
}

export const assertGetChainAdapter = (
  chainId: ChainId | KnownChainIds,
): ChainAdapter<KnownChainIds> => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (adapter === undefined) {
    throw Error(`chain adapter not found for chain id ${chainId}`)
  }

  return adapter
}

export const sortChainIdsByDisplayName = (unsortedChainIds: ChainId[]) => {
  const manager = getChainAdapterManager()
  const unsortedChainIdsWithName = unsortedChainIds.map(chainId => {
    return {
      chainId,
      displayName: manager.get(chainId)?.getDisplayName(),
    }
  })

  const sortedChainIds = orderBy(unsortedChainIdsWithName, 'displayName', 'asc').map(
    ({ chainId }) => chainId,
  )

  return sortedChainIds
}

export const getTimeFrameBounds = (timeframe: HistoryTimeframe): { start: Dayjs; end: Dayjs } => {
  const end = dayjs().startOf('minute')
  switch (timeframe) {
    case HistoryTimeframe.HOUR:
      return { end, start: end.subtract(1, 'hour') }
    case HistoryTimeframe.DAY:
      return { end, start: end.subtract(1, 'day') }
    case HistoryTimeframe.WEEK:
      return { end, start: end.subtract(1, 'week') }
    case HistoryTimeframe.MONTH:
      return { end, start: end.subtract(1, 'month') }
    case HistoryTimeframe.YEAR:
      return { end, start: end.subtract(1, 'year') }
    case HistoryTimeframe.ALL:
      return { end, start: end.subtract(20, 'years') }
    default:
      assertUnreachable(timeframe)
  }
}

export const chainIdToFeeAssetId = (chainId: ChainId): AssetId | undefined =>
  getChainAdapterManager().get(chainId)?.getFeeAssetId()

export const chainIdToChainDisplayName = (chainId: ChainId): AssetId =>
  assertGetChainAdapter(chainId).getDisplayName()

export const assetIdToFeeAssetId = (assetId: AssetId): AssetId | undefined =>
  chainIdToFeeAssetId(fromAssetId(assetId).chainId)

export const isKnownChainId = (chainId: ChainId): chainId is KnownChainIds =>
  Object.values(KnownChainIds).includes(chainId as KnownChainIds)

export function assertIsKnownChainId(chainId: ChainId): asserts chainId is KnownChainIds {
  if (!isKnownChainId(chainId)) {
    throw Error(`Unknown ChainId${chainId}`)
  }
}

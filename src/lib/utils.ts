import {
  ASSET_REFERENCE,
  AssetReference,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  ChainId,
  ChainNamespace,
  ChainReference,
  fromChainId,
  toChainId,
} from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'
import difference from 'lodash/difference'
import intersection from 'lodash/intersection'

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

// TODO: Remove: this is a temporary helper to allow web to support caip v5 before other lib packages are ready
/**
 * Returns mainnet ChainId parts, ChainNamespace and ChainReference
 *
 * @param chainType - The chainType to destructure
 */
export const chainTypeToMainnetChainParts = (
  chainType: ChainTypes,
): { chainNamespace: ChainNamespace; chainReference: ChainReference } => {
  return (() => {
    switch (chainType) {
      case ChainTypes.Bitcoin:
        return {
          chainNamespace: CHAIN_NAMESPACE.Bitcoin,
          chainReference: CHAIN_REFERENCE.BitcoinMainnet,
        }
      case ChainTypes.Ethereum:
        return {
          chainNamespace: CHAIN_NAMESPACE.Ethereum,
          chainReference: CHAIN_REFERENCE.EthereumMainnet,
        }
      case ChainTypes.Cosmos:
        return {
          chainNamespace: CHAIN_NAMESPACE.Cosmos,
          chainReference: CHAIN_REFERENCE.CosmosHubMainnet,
        }
      case ChainTypes.Osmosis:
        return {
          chainNamespace: CHAIN_NAMESPACE.Cosmos,
          chainReference: CHAIN_REFERENCE.OsmosisMainnet,
        }
      default:
        throw new Error(`Chain type ${chainType} not supported.`)
    }
  })()
}

// TODO: Remove: this is a temporary helper to allow web to support caip v5 before other lib packages are ready
/**
 * Returns mainnet ChainId
 *
 * @param chainType - The chainType to parse as a mainnet ChainId
 */
export const chainTypeToMainnetChainId = (chainType: ChainTypes): ChainId => {
  return toChainId(chainTypeToMainnetChainParts(chainType))
}

// TODO: Remove: this is a temporary helper to allow web to support caip v5 before other lib packages are ready
export const chainPartsToChainType = (
  chainNamespace: ChainNamespace,
  chainReference?: ChainReference,
): ChainTypes => {
  return (() => {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Bitcoin:
        return ChainTypes.Bitcoin
      case CHAIN_NAMESPACE.Ethereum:
        return ChainTypes.Ethereum
      case CHAIN_NAMESPACE.Cosmos:
        return chainReference === CHAIN_REFERENCE.CosmosHubMainnet
          ? ChainTypes.Cosmos
          : ChainTypes.Osmosis
      default:
        throw new Error(
          `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`,
        )
    }
  })()
}

// TODO: Remove: this is a temporary helper to allow web to support caip v5 before other lib packages are ready
export const chainIdToChainType = (chainId: ChainId): ChainTypes => {
  const { chainNamespace, chainReference } = fromChainId(chainId)
  return chainPartsToChainType(chainNamespace, chainReference)
}

export const isToken = (assetReference: AssetReference | string) =>
  !Object.values(ASSET_REFERENCE).includes(assetReference as AssetReference)

export const tokenOrUndefined = (assetReference: AssetReference | string) =>
  isToken(assetReference) ? assetReference : undefined

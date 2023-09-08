import type { AssetId, AssetNamespace, AssetReference } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import { fromChainId } from './chainId/chainId'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  VALID_CHAIN_IDS,
} from './constants'
import { isValidChainPartsPair } from './utils'

export const isChainNamespace = (
  maybeChainNamespace: ChainNamespace | string,
): maybeChainNamespace is ChainNamespace =>
  Object.values(CHAIN_NAMESPACE).includes(maybeChainNamespace as ChainNamespace)

export const isChainReference = (
  maybeChainReference: ChainReference | string,
): maybeChainReference is ChainReference =>
  Object.values(CHAIN_REFERENCE).includes(maybeChainReference as ChainReference)

export const isAssetNamespace = (
  maybeAssetNamespace: AssetNamespace | string,
): maybeAssetNamespace is AssetNamespace =>
  Object.values(ASSET_NAMESPACE).includes(maybeAssetNamespace as AssetNamespace)

export const isAssetReference = (
  maybeAssetReference: AssetReference | string,
): maybeAssetReference is AssetReference =>
  Object.values(ASSET_REFERENCE).includes(maybeAssetReference as AssetReference)

// NOTE: perf critical - benchmark any changes
export const isAssetId = (maybeAssetId: AssetId | string): maybeAssetId is AssetId => {
  const slashIdx = maybeAssetId.indexOf('/')
  const chainId = maybeAssetId.substring(0, slashIdx)
  const assetParts = maybeAssetId.substring(slashIdx + 1)

  const { chainNamespace, chainReference } = fromChainId(chainId as ChainId)

  const idx = assetParts.indexOf(':')
  const assetNamespace = assetParts.substring(0, idx)

  return isAssetIdParts(chainNamespace, chainReference, assetNamespace)
}

// NOTE: perf critical - benchmark any changes
export const isAssetIdParts = (
  maybeChainNamespace: string,
  maybeChainReference: string,
  maybeAssetNamespace: string,
): boolean => {
  return (
    !!VALID_CHAIN_IDS[maybeChainNamespace as ChainNamespace]?.includes(
      maybeChainReference as ChainReference,
    ) && isAssetNamespace(maybeAssetNamespace)
  )
}

// NOTE: perf critical - benchmark any changes
export const isChainId = (maybeChainId: ChainId | string): maybeChainId is ChainId => {
  const { chainNamespace, chainReference } = fromChainId(maybeChainId as ChainId)
  return !!VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference)
}

export const isChainIdParts = (chainNamespace: string, chainReference: string): boolean => {
  return !!VALID_CHAIN_IDS[chainNamespace as ChainNamespace]?.includes(
    chainReference as ChainReference,
  )
}

const getTypeGuardAssertion = <T>(
  typeGuard: (maybeT: T | string) => maybeT is T,
  message: string,
) => {
  return (value: T | string | undefined): asserts value is T => {
    if ((value && !typeGuard(value)) || !value) throw new Error(`${message}: ${value}`)
  }
}

export const assertIsChainId: (value: ChainId | string | undefined) => asserts value is ChainId =
  getTypeGuardAssertion(isChainId, 'assertIsChainId: unsupported ChainId')

export const assertIsChainNamespace: (
  value: ChainNamespace | string | undefined,
) => asserts value is ChainNamespace = getTypeGuardAssertion(
  isChainNamespace,
  'assertIsChainNamespace: unsupported ChainNamespace',
)

export const assertIsChainReference: (
  value: ChainReference | string | undefined,
) => asserts value is ChainReference = getTypeGuardAssertion(
  isChainReference,
  'assertIsChainReference: unsupported ChainReference',
)

export const assertIsAssetNamespace: (
  value: AssetNamespace | string | undefined,
) => asserts value is AssetNamespace = getTypeGuardAssertion(
  isAssetNamespace,
  'assertIsAssetNamespace: unsupported AssetNamespace',
)

export const assertIsAssetReference: (
  value: AssetReference | string | undefined,
) => asserts value is AssetReference = getTypeGuardAssertion(
  isAssetReference,
  'assertIsAssetReference: unsupported AssetReference',
)

export const assertValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
) => {
  if (!isValidChainPartsPair(chainNamespace, chainReference))
    throw new Error(
      `toAssetId: Chain Reference ${chainReference} not supported for Chain Namespace ${chainNamespace}`,
    )
}

import type { AssetId, AssetNamespace, AssetReference } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import { ASSET_NAMESPACE, ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from './constants'
import { isValidChainPartsPair } from './utils'

const chainNamespaces = new Set(Object.values(CHAIN_NAMESPACE))
const chainReferences = new Set(Object.values(CHAIN_REFERENCE))
const assetNamespaces = new Set(Object.values(ASSET_NAMESPACE))
const assetReferences = new Set(Object.values(ASSET_REFERENCE))

export const isChainNamespace = (
  maybeChainNamespace: ChainNamespace | string,
): maybeChainNamespace is ChainNamespace =>
  chainNamespaces.has(maybeChainNamespace as ChainNamespace)

export const isChainReference = (
  maybeChainReference: ChainReference | string,
): maybeChainReference is ChainReference =>
  chainReferences.has(maybeChainReference as ChainReference)

export const isAssetNamespace = (
  maybeAssetNamespace: AssetNamespace | string,
): maybeAssetNamespace is AssetNamespace =>
  assetNamespaces.has(maybeAssetNamespace as AssetNamespace)

export const isAssetReference = (
  maybeAssetReference: AssetReference | string,
): maybeAssetReference is AssetReference =>
  assetReferences.has(maybeAssetReference as AssetReference)

export const isAssetId = (maybeAssetId: AssetId | string): maybeAssetId is AssetReference => {
  const [maybeChainId] = maybeAssetId.split('/')
  const index = maybeAssetId.indexOf('/')
  const assetPart = maybeAssetId.slice(index + 1)
  if (!isChainId(maybeChainId)) return false
  if (!assetPart) return false
  const [assetNamespace] = assetPart.split(':')
  return isAssetNamespace(assetNamespace)
}

export const isChainId = (maybeChainId: ChainId | string): maybeChainId is ChainId => {
  // don't use regexes, they're slow
  const [maybeChainNamespace, maybeChainReference] = maybeChainId.split(':')
  return (
    isChainNamespace(maybeChainNamespace) &&
    isChainReference(maybeChainReference) &&
    isValidChainPartsPair(maybeChainNamespace, maybeChainReference)
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

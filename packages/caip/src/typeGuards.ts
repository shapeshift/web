import { AssetId, AssetNamespace, AssetReference } from './assetId/assetId'
import { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import {
  ASSET_NAMESPACE_STRINGS,
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE
} from './constants'
import { isValidChainPartsPair, parseAssetIdRegExp } from './utils'

export const isChainNamespace = (
  maybeChainNamespace: ChainNamespace | string
): maybeChainNamespace is ChainNamespace =>
  Object.values(CHAIN_NAMESPACE).some((s) => s === maybeChainNamespace)

export const isChainReference = (
  maybeChainReference: ChainReference | string
): maybeChainReference is ChainReference =>
  Object.values(CHAIN_REFERENCE).some((s) => s === maybeChainReference)

export const isAssetNamespace = (
  maybeAssetNamespace: AssetNamespace | string
): maybeAssetNamespace is AssetNamespace =>
  ASSET_NAMESPACE_STRINGS.some((s) => s === maybeAssetNamespace)

export const isAssetReference = (
  maybeAssetReference: AssetReference | string
): maybeAssetReference is AssetReference =>
  Object.values(ASSET_REFERENCE).some((s) => s === maybeAssetReference)

export const isAssetId = (maybeAssetId: AssetId | string): maybeAssetId is AssetReference => {
  const matches = parseAssetIdRegExp.exec(maybeAssetId)?.groups
  return (
    !!matches &&
    isChainNamespace(matches.chainNamespace) &&
    isChainReference(matches.chainReference) &&
    isAssetNamespace(matches.assetNamespace)
  )
}

export const isChainId = (maybeChainId: ChainId | string): maybeChainId is ChainId => {
  // https://regex101.com/r/iCqlyB/1
  const chainIdRegExp = /(?<chainNamespace>[-a-z\d]{3,8}):(?<chainReference>[-a-zA-Z\d]{1,32})/
  const [maybeChainNamespace, maybeChainReference] =
    chainIdRegExp.exec(maybeChainId)?.slice(1) ?? []
  return (
    isChainNamespace(maybeChainNamespace) &&
    isChainReference(maybeChainReference) &&
    isValidChainPartsPair(maybeChainNamespace, maybeChainReference)
  )
}

const getTypeGuardAssertion = <T>(
  typeGuard: (maybeT: T | string) => maybeT is T,
  message: string
) => {
  return (value: T | string | undefined): asserts value is T => {
    if ((value && !typeGuard(value)) || !value) throw new Error(`${message}: ${value}`)
  }
}

export const assertIsChainId: (value: ChainId | string | undefined) => asserts value is ChainId =
  getTypeGuardAssertion(isChainId, 'assertIsChainId: unsupported ChainId')

export const assertIsChainNamespace: (
  value: ChainNamespace | string | undefined
) => asserts value is ChainNamespace = getTypeGuardAssertion(
  isChainNamespace,
  'assertIsChainNamespace: unsupported ChainNamespace'
)

export const assertIsChainReference: (
  value: ChainReference | string | undefined
) => asserts value is ChainReference = getTypeGuardAssertion(
  isChainReference,
  'assertIsChainReference: unsupported ChainReference'
)

export const assertIsAssetNamespace: (
  value: AssetNamespace | string | undefined
) => asserts value is AssetNamespace = getTypeGuardAssertion(
  isAssetNamespace,
  'assertIsAssetNamespace: unsupported AssetNamespace'
)

export const assertIsAssetReference: (
  value: AssetReference | string | undefined
) => asserts value is AssetReference = getTypeGuardAssertion(
  isAssetReference,
  'assertIsAssetReference: unsupported AssetReference'
)

export const assertValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference
) => {
  if (!isValidChainPartsPair(chainNamespace, chainReference))
    throw new Error(
      `toAssetId: Chain Reference ${chainReference} not supported for Chain Namespace ${chainNamespace}`
    )
}

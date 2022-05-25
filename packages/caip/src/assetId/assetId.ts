// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md
import toLower from 'lodash/toLower'

import { ChainId, ChainNamespace, ChainReference, fromChainId, toChainId } from '../chainId/chainId'
import { ASSET_NAMESPACE_STRINGS, ASSET_REFERENCE, VALID_ASSET_NAMESPACE } from '../constants'
import {
  assertIsAssetNamespace,
  assertIsChainNamespace,
  assertIsChainReference,
  assertValidChainPartsPair,
  isAssetId,
  isAssetNamespace
} from '../typeGuards'
import { parseAssetIdRegExp } from '../utils'

export type AssetId = string

export type AssetNamespace = typeof ASSET_NAMESPACE_STRINGS[number]

export type AssetReference = typeof ASSET_REFERENCE[keyof typeof ASSET_REFERENCE]

type ToAssetIdWithChainId = {
  chainNamespace?: never
  chainReference?: never
  chainId: ChainId
  assetNamespace: AssetNamespace
  assetReference: AssetReference | string
}

type ToAssetIdWithChainIdParts = {
  chainNamespace: ChainNamespace
  chainReference: ChainReference
  chainId?: never
  assetNamespace: AssetNamespace
  assetReference: AssetReference | string
}

export type ToAssetIdArgs = ToAssetIdWithChainId | ToAssetIdWithChainIdParts

/**
 * validate that a value is a string slip44 value
 * @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 * @param {string} value - possible slip44 value
 */
const isValidSlip44 = (value: string) => {
  const n = Number(value)
  // slip44 has a max value of an unsigned 32-bit integer
  return !isNaN(n) && n >= 0 && n < 4294967296
}

type ToAssetId = (args: ToAssetIdArgs) => AssetId

const isToAssetIdWithChainIdArgs = (args: ToAssetIdArgs): args is ToAssetIdWithChainId =>
  !!args.chainId

export const toAssetId: ToAssetId = (args: ToAssetIdArgs): AssetId => {
  const { assetNamespace, assetReference } = args
  assertIsAssetNamespace(assetNamespace)
  if (!assetReference) throw new Error('toAssetId: No assetReference provided')

  const { chainId, chainNamespace, chainReference } = (() => {
    if (isToAssetIdWithChainIdArgs(args)) {
      const fromChainIdResult = fromChainId(args.chainId)
      return {
        chainId: args.chainId,
        chainNamespace: fromChainIdResult.chainNamespace,
        chainReference: fromChainIdResult.chainReference
      }
    } else
      return {
        chainId: toChainId({
          chainNamespace: args.chainNamespace,
          chainReference: args.chainReference
        }),
        chainNamespace: args.chainNamespace,
        chainReference: args.chainReference
      }
  })()

  const isContractAddress = Array<AssetNamespace>('erc20', 'erc721').includes(assetNamespace)

  assertIsChainNamespace(chainNamespace)
  assertIsChainReference(chainReference)
  assertValidChainPartsPair(chainNamespace, chainReference)

  if (
    !VALID_ASSET_NAMESPACE[chainNamespace].includes(assetNamespace) ||
    !isAssetNamespace(assetNamespace)
  )
    throw new Error(
      `toAssetId: AssetNamespace ${assetNamespace} not supported for Chain Namespace ${chainNamespace}`
    )

  if (assetNamespace === 'slip44' && !isValidSlip44(String(assetReference))) {
    throw new Error(`Invalid reference for namespace slip44`)
  }

  if (isContractAddress) {
    if (!assetReference.startsWith('0x'))
      throw new Error(`toAssetId: assetReference must start with 0x: ${assetReference}`)
    if (assetReference.length !== 42)
      throw new Error(
        `toAssetId: assetReference length must be 42, length: ${assetReference.length}`
      )
  }

  // We make Eth contract addresses lower case to simplify comparisons
  const assetReferenceCaseCorrected = isContractAddress
    ? assetReference.toLowerCase()
    : assetReference

  return `${chainId}/${assetNamespace}:${assetReferenceCaseCorrected}`
}

type FromAssetIdReturn = {
  chainNamespace: ChainNamespace
  chainReference: ChainReference
  chainId: ChainId
  assetNamespace: AssetNamespace
  assetReference: AssetReference | string
}

export type FromAssetId = (assetId: AssetId) => FromAssetIdReturn

export const fromAssetId: FromAssetId = (assetId) => {
  if (!isAssetId(assetId)) throw new Error(`fromAssetId: invalid AssetId: ${assetId}`)
  const matches = parseAssetIdRegExp.exec(assetId)?.groups
  if (!matches) throw new Error(`fromAssetId: could not parse AssetId: ${assetId}`)

  // These should never throw because isAssetId() would have already caught it, but they help with type inference
  assertIsChainNamespace(matches.chainNamespace)
  assertIsChainReference(matches.chainReference)
  assertIsAssetNamespace(matches.assetNamespace)

  const chainNamespace = matches.chainNamespace
  const chainReference = matches.chainReference
  const assetNamespace = matches.assetNamespace

  const shouldLowercaseAssetReference =
    assetNamespace && ['erc20', 'erc721'].includes(assetNamespace)

  const assetReference = shouldLowercaseAssetReference
    ? toLower(matches.assetReference)
    : matches.assetReference
  assertIsChainReference(chainReference)
  assertIsChainNamespace(chainNamespace)
  const chainId = toChainId({ chainNamespace, chainReference })

  if (assetNamespace && assetReference && chainId) {
    return { chainId, chainReference, chainNamespace, assetNamespace, assetReference }
  } else {
    throw new Error(`fromAssetId: invalid AssetId: ${assetId}`)
  }
}

export const toCAIP19 = toAssetId
export const fromCAIP19 = fromAssetId

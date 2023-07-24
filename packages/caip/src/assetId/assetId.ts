// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md

import type { ChainId, ChainNamespace, ChainReference } from '../chainId/chainId'
import { fromChainId, toChainId } from '../chainId/chainId'
import type { ASSET_NAMESPACE, ASSET_REFERENCE } from '../constants'
import { VALID_ASSET_NAMESPACE } from '../constants'
import {
  assertIsAssetNamespace,
  assertIsChainNamespace,
  assertIsChainReference,
  assertValidChainPartsPair,
  isAssetIdParts,
  isAssetNamespace,
} from '../typeGuards'
import type { Nominal } from '../utils'

export type AssetId = Nominal<string, 'AssetId'>

export type AssetNamespace = typeof ASSET_NAMESPACE[keyof typeof ASSET_NAMESPACE]

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
        chainReference: fromChainIdResult.chainReference,
      }
    } else
      return {
        chainId: toChainId({
          chainNamespace: args.chainNamespace,
          chainReference: args.chainReference,
        }),
        chainNamespace: args.chainNamespace,
        chainReference: args.chainReference,
      }
  })()

  assertIsChainNamespace(chainNamespace)
  assertIsChainReference(chainReference)
  assertValidChainPartsPair(chainNamespace, chainReference)

  if (
    !VALID_ASSET_NAMESPACE[chainNamespace].includes(assetNamespace) ||
    !isAssetNamespace(assetNamespace)
  )
    throw new Error(
      `toAssetId: AssetNamespace ${assetNamespace} not supported for Chain Namespace ${chainNamespace}`,
    )

  if (assetNamespace === 'slip44' && !isValidSlip44(String(assetReference))) {
    throw new Error(`Invalid reference for namespace slip44`)
  }

  const assetReferenceNormalized = (() => {
    const assertContractAddress = (address: string) => {
      if (!address.startsWith('0x'))
        throw new Error(`toAssetId: assetReference must start with 0x: ${assetReference}`)

      if (address.length !== 42)
        throw new Error(
          `toAssetId: assetReference length must be 42, length: ${assetReference.length}, ${assetReference}`,
        )
    }

    switch (assetNamespace) {
      case 'erc20':
      case 'bep20':
        assertContractAddress(assetReference)
        return assetReference.toLowerCase()
      case 'erc721':
      case 'erc1155':
      case 'bep721':
      case 'bep1155':
        // caip-22 (https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-22.md)
        // caip-29 (https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-29.md)
        const [address] = assetReference.split('/')
        assertContractAddress(address)
        return assetReference.toLowerCase()
      default:
        return assetReference
    }
  })()

  return `${chainId}/${assetNamespace}:${assetReferenceNormalized}`
}

type FromAssetIdReturn = {
  chainNamespace: ChainNamespace
  chainReference: ChainReference
  chainId: ChainId
  assetNamespace: AssetNamespace
  assetReference: AssetReference | string
}

export type FromAssetId = (assetId: AssetId) => FromAssetIdReturn

// NOTE: perf critical - benchmark any changes
export const fromAssetId: FromAssetId = (assetId: string) => {
  const slashIdx = assetId.indexOf('/')
  const chainId = assetId.substring(0, slashIdx)
  const assetParts = assetId.substring(slashIdx + 1)

  const { chainNamespace, chainReference } = fromChainId(chainId as ChainId)

  const idx = assetParts.indexOf(':')
  const assetNamespace = assetParts.substring(0, idx)
  const assetReference = assetParts.substring(idx + 1)

  if (!isAssetIdParts(chainNamespace, chainReference, assetNamespace))
    throw new Error(`fromAssetId: invalid AssetId: ${assetId}`)

  const assetReferenceNormalized = (() => {
    switch (assetNamespace) {
      case 'erc20':
      case 'bep20':
      case 'erc721':
      case 'erc1155':
      case 'bep721':
      case 'bep1155':
        return assetReference.toLowerCase()
      default:
        return assetReference
    }
  })()

  return {
    chainId,
    chainNamespace: chainNamespace as ChainNamespace,
    chainReference: chainReference as ChainReference,
    assetNamespace: assetNamespace as AssetNamespace,
    assetReference: assetReferenceNormalized,
  }
}

// NOTE: perf critical - benchmark any changes
export const isNft = (assetId: AssetId): boolean => {
  const slashIdx = assetId.indexOf('/')
  const assetParts = assetId.substring(slashIdx + 1)
  const idx = assetParts.indexOf(':')
  const assetNamespace = assetParts.substring(0, idx)
  return ['erc721', 'erc1155', 'bep721', 'bep1155'].includes(assetNamespace)
}

export const deserializeNftAssetReference = (
  assetReference: string,
): [address: string, id: string] => {
  const [address, id] = assetReference.split('/')
  return [address, id]
}

export const toCAIP19 = toAssetId
export const fromCAIP19 = fromAssetId

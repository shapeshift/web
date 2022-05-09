// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import {
  ChainNamespace,
  chainNamespaceToChainType,
  ChainReference,
  chainReferenceToNetworkType,
  toChainId
} from '../chainId/chainId'

export type AssetId = string

export enum AssetNamespace {
  CW20 = 'cw20',
  CW721 = 'cw721',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  Slip44 = 'slip44',
  NATIVE = 'native',
  IBC = 'ibc'
}

export enum AssetReference {
  Bitcoin = '0',
  Ethereum = '60',
  Cosmos = '118',
  Osmosis = '118'
}

type ToAssetIdArgs = {
  chain: ChainTypes
  network: NetworkTypes | ChainReference
  assetNamespace: AssetNamespace
  assetReference: AssetReference | string
}

const validAssetNamespaces = Object.freeze({
  [ChainTypes.Bitcoin]: [AssetNamespace.Slip44],
  [ChainTypes.Ethereum]: [AssetNamespace.Slip44, AssetNamespace.ERC20, AssetNamespace.ERC721],
  [ChainTypes.Cosmos]: [
    AssetNamespace.CW20,
    AssetNamespace.CW721,
    AssetNamespace.IBC,
    AssetNamespace.NATIVE,
    AssetNamespace.Slip44
  ],
  [ChainTypes.Osmosis]: [
    AssetNamespace.CW20,
    AssetNamespace.CW721,
    AssetNamespace.IBC,
    AssetNamespace.NATIVE,
    AssetNamespace.Slip44
  ]
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stringToEnum<T>(obj: any, item: string): T | undefined {
  const found = Object.entries(obj).find((i) => i.includes(item))?.[0]
  return found ? obj[found as keyof T] : undefined
}

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

type ToAssetId = (args: ToAssetIdArgs) => string

export const toAssetId: ToAssetId = (args: ToAssetIdArgs): string => {
  const { chain, network, assetNamespace } = args
  let { assetReference } = args
  if (!chain) throw new Error('toAssetId: No chain provided')
  if (!network) throw new Error('toAssetId: No chainReference Provided')
  if (!assetNamespace) throw new Error('toAssetId: No assetNamespace provided')
  if (!assetReference) throw new Error('toAssetId: No assetReference provided')

  const chainId = toChainId({ chain, network })

  if (!validAssetNamespaces[chain].includes(assetNamespace)) {
    throw new Error(`toAssetId: Asset Namespace ${assetNamespace} not supported for chain ${chain}`)
  }

  if (assetNamespace === AssetNamespace.Slip44 && !isValidSlip44(String(assetReference))) {
    throw new Error(`Invalid reference for namespace slip44`)
  }

  if ([AssetNamespace.ERC20, AssetNamespace.ERC721].includes(assetNamespace)) {
    if (!assetReference.startsWith('0x')) {
      throw new Error(`toAssetId: assetReference must start with 0x: ${assetReference}`)
    }
    if (assetReference.length !== 42) {
      throw new Error(
        `toAssetId: assetReference length must be 42, length: ${assetReference.length}`
      )
    }

    // We make Eth contract addresses lower case to simplify comparisons
    assetReference = assetReference.toLowerCase()
  }

  return `${chainId}/${assetNamespace}:${assetReference}`
}

type FromAssetIdReturn = {
  chain: ChainTypes
  network: NetworkTypes
  assetNamespace: AssetNamespace
  assetReference: AssetReference | string
}

const parseAssetIdRegExp = /([-a-z\d]{3,8}):([-a-zA-Z\d]{1,32})\/([-a-z\d]{3,8}):([-a-zA-Z\d]+)/

export const fromAssetId = (assetId: string): FromAssetIdReturn => {
  const matches = parseAssetIdRegExp.exec(assetId) ?? []

  // We're okay casting these strings to enums because we check to make sure
  // they are valid enum values
  let chain: ChainTypes = chainNamespaceToChainType[matches[1] as ChainNamespace]
  const network = chainReferenceToNetworkType[matches[2] as ChainReference]
  const assetNamespace = stringToEnum<AssetNamespace>(AssetNamespace, matches[3])
  let assetReference = matches[4]

  if (chain && network && assetNamespace && assetReference) {
    switch (network) {
      case NetworkTypes.OSMOSIS_MAINNET:
      case NetworkTypes.OSMOSIS_TESTNET:
        chain = ChainTypes.Osmosis
    }

    switch (assetNamespace) {
      case AssetNamespace.ERC20:
      case AssetNamespace.ERC721: {
        assetReference = assetReference.toLowerCase()
      }
    }

    return { chain, network, assetNamespace, assetReference }
  }

  throw new Error(`fromAssetId: invalid AssetId: ${assetId}`)
}

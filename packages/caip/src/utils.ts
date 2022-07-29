import { AccountId, fromAccountId } from './accountId/accountId'
import { AssetId, fromAssetId } from './assetId/assetId'
import { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import * as constants from './constants'

// https://regex101.com/r/f0xGqP/2
export const parseAssetIdRegExp =
  /(?<chainNamespace>[-a-z\d]{3,8}):(?<chainReference>[-a-zA-Z\d]{1,32})\/(?<assetNamespace>[-a-z\d]{3,8}):(?<assetReference>[-a-zA-Z\d]+)/

// TODO(ryankk): this will be removed and replaced with something like `toAssetId(fromChainId(chainId))`
// when `fromChainId` supports returning ChainNamespace and ChainReference.
export const chainIdToAssetId: Record<ChainId, AssetId> = {
  [constants.ethChainId]: constants.ethAssetId,
  [constants.btcChainId]: constants.btcAssetId,
  [constants.dogeChainId]: constants.dogeAssetId,
  [constants.cosmosChainId]: constants.cosmosAssetId,
  [constants.osmosisChainId]: constants.osmosisAssetId,
  [constants.avalancheChainId]: constants.avalancheAssetId
}

export const accountIdToChainId = (accountId: AccountId): ChainId =>
  fromAccountId(accountId).chainId

export const accountIdToSpecifier = (accountId: AccountId): string =>
  fromAccountId(accountId).account

// We make the assumption here that the fee assetIds are in `chainIdToAssetId` for each
// chain we support.
export const getFeeAssetIdFromAssetId = (assetId: AssetId): AssetId | undefined => {
  const { chainId } = fromAssetId(assetId)
  return chainIdToAssetId[chainId]
}

export const isValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference
) => constants.VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference) || false

export const bitcoinAssetMap = { [constants.btcAssetId]: 'bitcoin' }
export const dogecoinAssetMap = { [constants.dogeAssetId]: 'dogecoin' }
export const litecoinAssetMap = { [constants.ltcAssetId]: 'litecoin' }
export const cosmosAssetMap = { [constants.cosmosAssetId]: 'cosmos' }
export const osmosisAssetMap = { [constants.osmosisAssetId]: 'osmosis' }

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>

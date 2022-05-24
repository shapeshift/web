import { AccountId, fromAccountId } from './accountId/accountId'
import { AssetId, fromAssetId, toAssetId } from './assetId/assetId'
import { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import {
  ASSET_REFERENCE,
  btcAssetId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosAssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  osmosisAssetId,
  osmosisChainId,
  VALID_CHAIN_IDS
} from './constants'

// https://regex101.com/r/f0xGqP/2
export const parseAssetIdRegExp =
  /(?<chainNamespace>[-a-z\d]{3,8}):(?<chainReference>[-a-zA-Z\d]{1,32})\/(?<assetNamespace>[-a-z\d]{3,8}):(?<assetReference>[-a-zA-Z\d]+)/

// TODO(ryankk): this will be removed and replaced with something like `toAssetId(fromChainId(chainId))`
// when `fromChainId` supports returning ChainNamespace and ChainReference.
export const chainIdToAssetId: Record<ChainId, AssetId> = {
  [ethChainId]: ethAssetId,
  [btcChainId]: btcAssetId,
  [cosmosChainId]: cosmosAssetId,
  [osmosisChainId]: osmosisAssetId
}

export const accountIdToChainId = (accountId: AccountId): ChainId =>
  fromAccountId(accountId).chainId

export const accountIdToSpecifier = (accountId: AccountId): string =>
  fromAccountId(accountId).account

export const chainIdToFeeAssetId = (chainId: ChainId): AssetId => chainIdToAssetId[chainId]

// We make the assumption here that the fee assetIds are in `chainIdToAssetId` for each
// chain we support.
export const getFeeAssetIdFromAssetId = (assetId: AssetId): AssetId | undefined => {
  const { chainId } = fromAssetId(assetId)
  return chainIdToAssetId[chainId]
}

export const isValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference
) => VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference) || false

export const makeBtcData = () => {
  const chainNamespace = CHAIN_NAMESPACE.Bitcoin
  const chainReference = CHAIN_REFERENCE.BitcoinMainnet
  const assetId = toAssetId({
    chainNamespace,
    chainReference,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Bitcoin
  })
  return { [assetId]: 'bitcoin' }
}

export const makeCosmosHubData = () => {
  const chainNamespace = CHAIN_NAMESPACE.Cosmos
  const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
  const assetId = toAssetId({
    chainNamespace,
    chainReference,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Cosmos
  })
  return { [assetId]: 'cosmos' }
}

export const makeOsmosisData = () => {
  const chainNamespace = CHAIN_NAMESPACE.Cosmos
  const chainReference = CHAIN_REFERENCE.OsmosisMainnet
  const assetId = toAssetId({
    chainNamespace,
    chainReference,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Osmosis
  })
  return { [assetId]: 'osmosis' }
}

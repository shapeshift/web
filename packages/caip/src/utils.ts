import type { AccountId } from './accountId/accountId'
import { fromAccountId } from './accountId/accountId'
import type { AssetId } from './assetId/assetId'
import { fromAssetId, toAssetId } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import * as constants from './constants'

export const accountIdToChainId = (accountId: AccountId): ChainId =>
  fromAccountId(accountId).chainId

export const accountIdToSpecifier = (accountId: AccountId): string =>
  fromAccountId(accountId).account

export const isValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
) => constants.VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference) || false

export const generateAssetIdFromCosmosSdkDenom = (
  denom: string,
  nativeAssetId: AssetId,
): AssetId => {
  if (denom.startsWith('ibc')) {
    return toAssetId({
      assetNamespace: constants.ASSET_NAMESPACE.ibc,
      assetReference: denom.split('/')[1],
      chainId: fromAssetId(nativeAssetId).chainId,
    })
  }

  return nativeAssetId
}

export const bitcoinAssetMap = { [constants.btcAssetId]: 'bitcoin' }
export const bitcoinCashAssetMap = { [constants.bchAssetId]: 'bitcoin-cash' }
export const dogecoinAssetMap = { [constants.dogeAssetId]: 'dogecoin' }
export const litecoinAssetMap = { [constants.ltcAssetId]: 'litecoin' }
export const cosmosAssetMap = { [constants.cosmosAssetId]: 'cosmos' }
export const thorchainAssetMap = { [constants.thorchainAssetId]: 'thorchain' }

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>

export const getAssetNamespaceFromChainId = (chainId: KnownChainIds): ASSET_NAMESPACE => {
  switch (chainId) {
    case KnownChainIds.BnbSmartChainMainnet:
      return ASSET_NAMESPACE.bep20
    case KnownChainIds.SolanaMainnet:
      return ASSET_NAMESPACE.splToken
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.OptimismMainnet:
    case KnownChainIds.PolygonMainnet:
    case KnownChainIds.GnosisMainnet:
    case KnownChainIds.ArbitrumMainnet:
    case KnownChainIds.ArbitrumNovaMainnet:
    case KnownChainIds.BaseMainnet:
      return ASSET_NAMESPACE.erc20
    case KnownChainIds.CosmosMainnet:
    case KnownChainIds.ThorchainMainnet:
      return ASSET_NAMESPACE.ibc
    case KnownChainIds.BitcoinMainnet:
    case KnownChainIds.BitcoinCashMainnet:
    case KnownChainIds.DogecoinMainnet:
    case KnownChainIds.LitecoinMainnet:
      throw Error(`Unhandled case '${chainId}'`)
    default:
      return assertUnreachable(chainId)
  }
}

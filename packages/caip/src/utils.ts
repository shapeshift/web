import type { AccountId } from './accountId/accountId'
import { fromAccountId } from './accountId/accountId'
import type { AssetId } from './assetId/assetId'
import { toAssetId } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  bchAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ltcAssetId,
  osmosisAssetId,
  osmosisChainId,
  thorchainAssetId,
  VALID_CHAIN_IDS,
} from './constants'

export const accountIdToChainId = (accountId: AccountId): ChainId =>
  fromAccountId(accountId).chainId

export const accountIdToSpecifier = (accountId: AccountId): string =>
  fromAccountId(accountId).account

export const isValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
) => VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference) || false

export const generateAssetIdFromOsmosisDenom = (denom: string): AssetId => {
  if (denom.startsWith('u') && denom !== 'uosmo') {
    return toAssetId({
      assetNamespace: ASSET_NAMESPACE.native,
      assetReference: denom,
      chainId: osmosisChainId,
    })
  }

  if (denom.startsWith('ibc')) {
    return toAssetId({
      assetNamespace: ASSET_NAMESPACE.ibc,
      assetReference: denom.split('/')[1],
      chainId: osmosisChainId,
    })
  }

  if (denom.startsWith('gamm')) {
    return toAssetId({
      assetNamespace: ASSET_NAMESPACE.ibc,
      assetReference: denom,
      chainId: osmosisChainId,
    })
  }

  return toAssetId({
    assetNamespace: ASSET_NAMESPACE.slip44,
    assetReference: ASSET_REFERENCE.Osmosis,
    chainId: osmosisChainId,
  })
}

export const bitcoinAssetMap = { [btcAssetId]: 'bitcoin' }
export const bitcoinCashAssetMap = { [bchAssetId]: 'bitcoin-cash' }
export const dogecoinAssetMap = { [dogeAssetId]: 'dogecoin' }
export const litecoinAssetMap = { [ltcAssetId]: 'litecoin' }
export const cosmosAssetMap = { [cosmosAssetId]: 'cosmos' }
export const osmosisAssetMap = { [osmosisAssetId]: 'osmosis' }
export const thorchainAssetMap = { [thorchainAssetId]: 'thorchain' }

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>

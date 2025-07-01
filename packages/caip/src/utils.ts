import type { AccountId } from './accountId/accountId'
import { fromAccountId } from './accountId/accountId'
import type { AssetId } from './assetId/assetId'
import { fromAssetId, toAssetId } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import * as constants from './constants'
import { rujiAssetId, tcyAssetId } from './constants'

const mayaTokenAssetId: AssetId = 'cosmos:mayachain-mainnet-v1/slip44:maya'

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
  if (denom === 'tcy') return tcyAssetId
  if (denom === 'x/ruji') return rujiAssetId
  if (denom === 'maya') return mayaTokenAssetId

  // TODO: maybe bring me back some day, or maybe nuke me, we don't support IBC assets anymore, and absolutely don't want to fallback
  // to a default AssetId for THORChain assets, or this could produce v. bad and unintended behavior, cf. https://github.com/shapeshift/web/issues/9811
  // if (denom.startsWith('ibc')) {
  // return toAssetId({
  // assetNamespace: constants.ASSET_NAMESPACE.ibc,
  // assetReference: denom.split('/')[1],
  // chainId: fromAssetId(nativeAssetId).chainId,
  // })
  // }

  return nativeAssetId
}

export const bitcoinAssetMap = { [constants.btcAssetId]: 'bitcoin' }
export const bitcoinCashAssetMap = { [constants.bchAssetId]: 'bitcoin-cash' }
export const dogecoinAssetMap = { [constants.dogeAssetId]: 'dogecoin' }
export const litecoinAssetMap = { [constants.ltcAssetId]: 'litecoin' }
export const cosmosAssetMap = { [constants.cosmosAssetId]: 'cosmos' }
export const thorchainAssetMap = { [constants.thorchainAssetId]: 'thorchain' }
export const mayachainAssetMap = { [constants.mayachainAssetId]: 'cacao' }

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>

import type { AccountId } from './accountId/accountId'
import { fromAccountId } from './accountId/accountId'
import type { AssetId, AssetNamespace } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'
import * as constants from './constants'
import { rujiAssetId, tcyAssetId } from './constants'

const mayaTokenAssetId: AssetId = 'cosmos:mayachain-mainnet-v1/slip44:maya'

export const accountIdToChainId = (accountId: AccountId): ChainId =>
  fromAccountId(accountId).chainId

export const accountIdToSpecifier = (accountId: AccountId): string =>
  fromAccountId(accountId).account

// aptos coins are referenced by move struct type, fungible assets by metadata address
export const getAptosAssetNamespace = (assetReference: string): AssetNamespace =>
  assetReference.includes('::')
    ? constants.ASSET_NAMESPACE.aptosCoin
    : constants.ASSET_NAMESPACE.aptosFungible

export const isValidChainPartsPair = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
) => constants.VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference) || false

export const generateAssetIdFromCosmosSdkDenom = (denom: string): AssetId => {
  switch (denom) {
    case 'tcy':
      return tcyAssetId
    case 'x/ruji':
      return rujiAssetId
    case 'maya':
      return mayaTokenAssetId
    default:
      throw new Error(`Unsupported denom: ${denom}`)
  }
}

export const bitcoinAssetMap = { [constants.btcAssetId]: 'bitcoin' }
export const bitcoinCashAssetMap = { [constants.bchAssetId]: 'bitcoin-cash' }
export const dogecoinAssetMap = { [constants.dogeAssetId]: 'dogecoin' }
export const litecoinAssetMap = { [constants.ltcAssetId]: 'litecoin' }
export const zcashAssetMap = { [constants.zecAssetId]: 'zcash' }
export const cosmosAssetMap = { [constants.cosmosAssetId]: 'cosmos' }
export const thorchainAssetMap = { [constants.thorchainAssetId]: 'thorchain' }
export const mayachainAssetMap = { [constants.mayachainAssetId]: 'cacao' }

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>

import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { isNull, isUndefined } from 'lodash'

export * from './assertUnreachable'
export * from './assetData'
export * from './baseUnits/baseUnits'
export * from './basisPoints'
export * from './bignumber/bignumber'
export * from './chainIdToFeeAsset'
export * from './chainIdToFeeAssetId'
export * from './createThrottle'
export * from './getAssetNamespaceFromChainId'
export * from './getChainShortName'
export * from './getNativeFeeAssetReference'
export * from './historyTimeframe'
export * from './makeAsset/makeAsset'
export * from './promises'
export * from './sha256'
export * from './timeout'
export * from './treasury'
export * from './unfreeze'
export * from './utxo'

export const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

export const isToken = (assetId: AssetId) => {
  switch (fromAssetId(assetId).assetNamespace) {
    case ASSET_NAMESPACE.erc20:
    case ASSET_NAMESPACE.erc721:
    case ASSET_NAMESPACE.erc1155:
    case ASSET_NAMESPACE.splToken:
    case ASSET_NAMESPACE.trc20:
    case ASSET_NAMESPACE.suiCoin:
    case ASSET_NAMESPACE.starknetToken:
    case ASSET_NAMESPACE.nep141:
      return true
    default:
      return false
  }
}

export const isSplToken = (assetId: AssetId): boolean => {
  return fromAssetId(assetId).assetNamespace === ASSET_NAMESPACE.splToken
}

export const contractAddressOrUndefined = (assetId: AssetId) =>
  isToken(assetId) || isSplToken(assetId) ? fromAssetId(assetId).assetReference : undefined

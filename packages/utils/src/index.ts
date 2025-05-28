import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { isNull, isUndefined } from 'lodash'

export * from './makeAsset/makeAsset'
export * from './assertUnreachable'
export * from './sha256'
export * from './chainIdToFeeAsset'
export * from './chainIdToFeeAssetId'
export * from './utxo'
export * from './bignumber/bignumber'
export * from './basisPoints'
export * from './baseUnits/baseUnits'
export * from './promises'
export * from './treasury'
export * from './timeout'
export * from './createThrottle'
export * from './historyTimeframe'
export * from './getNativeFeeAssetReference'
export * from './assetData'
export * from './unfreeze'
export * from './getAssetNamespaceFromChainId'
export * from './getChainShortName'

export const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

export const isToken = (assetId: AssetId) => {
  switch (fromAssetId(assetId).assetNamespace) {
    case 'erc20':
    case 'erc721':
    case 'erc1155':
    case 'bep20':
    case 'bep721':
    case 'bep1155':
    case 'token':
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

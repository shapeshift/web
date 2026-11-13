import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, celoAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { isNull, isUndefined } from 'lodash-es'

export * from './assertUnreachable'
export * from './encoding'
export * from './assetData'
export * from './baseUnits/baseUnits'
export { BigAmount } from './bigAmount/bigAmount'
export type { BigAmountConfig } from './bigAmount/bigAmount'
export * from './basisPoints'
export * from './bignumber/bignumber'
export * from './chainIdToFeeAssetId'
export * from './createThrottle'
export * from './getAssetNamespaceFromChainId'
export * from './getChainShortName'
export * from './getNativeFeeAssetReference'
export * from './historyTimeframe'
export * from './makeAsset/makeAsset'
export * from './paymentUri/constants'
export * from './paymentUri/paymentUri'
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
    case ASSET_NAMESPACE.jetton:
    case ASSET_NAMESPACE.aptosCoin:
    case ASSET_NAMESPACE.aptosFungible:
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

// Native assets that are also ERC20s over the same balance, so contracts can pull them via transferFrom
const NATIVE_ERC20_ADDRESS_BY_ASSET_ID: Partial<Record<AssetId, string>> = {
  [celoAssetId]: '0x471EcE3750Da237f93B8E339c536989b8978a438',
}

export const getNativeErc20Address = (assetId: AssetId): string | undefined =>
  NATIVE_ERC20_ADDRESS_BY_ASSET_ID[assetId]

// The token contract an allowance for this asset lives on
export const getApprovalTokenAddress = (assetId: AssetId): string | undefined =>
  getNativeErc20Address(assetId) ??
  (isToken(assetId) ? fromAssetId(assetId).assetReference : undefined)

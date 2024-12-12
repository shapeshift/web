import type { SerializedError } from '@reduxjs/toolkit'
import type { Asset, CowSwapError } from '@shapeshiftoss/types'
import { OrderError } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { assertUnreachable } from 'lib/utils'
import { selectCalculatedFees } from 'state/apis/snapshot/selectors'
import type { ReduxState } from 'state/reducer'
import {
  selectAssets,
  selectFeeAssetById,
  selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import { store } from 'state/store'

export const isCowSwapError = (
  maybeCowSwapError: CowSwapError | SerializedError | undefined,
): maybeCowSwapError is CowSwapError => {
  return (
    typeof maybeCowSwapError === 'object' &&
    Object.values(OrderError).includes((maybeCowSwapError as CowSwapError).errorType)
  )
}

export const getCowSwapErrorTranslation = (
  limitOrderQuoteError: SerializedError | CowSwapError,
): string | [string, InterpolationOptions] => {
  if (!isCowSwapError(limitOrderQuoteError)) {
    return 'trade.errors.quoteError'
  }

  const { errorType } = limitOrderQuoteError

  switch (errorType) {
    case OrderError.INSUFFICIENT_BALANCE:
      return 'common.insufficientFunds'
    case OrderError.INSUFFICIENT_ALLOWANCE:
      return 'common.insufficientAllowance'
    case OrderError.ZERO_AMOUNT:
      return 'trade.errors.amountTooSmallUnknownMinimum'
    case OrderError.INSUFFICIENT_VALID_TO:
      return 'limitOrder.errors.insufficientValidTo'
    case OrderError.EXCESSIVE_VALID_TO:
      return 'limitOrder.errors.excessiveValidTo'
    case OrderError.INVALID_NATIVE_SELL_TOKEN:
      return 'limitOrder.errors.nativeSellAssetNotSupported'
    case OrderError.SAME_BUY_AND_SELL_TOKEN:
    case OrderError.UNSUPPORTED_TOKEN:
      return 'trade.errors.unsupportedTradePair'
    case OrderError.SELL_AMOUNT_DOES_NOT_COVER_FEE:
      return 'trade.errors.sellAmountDoesNotCoverFee'
    case OrderError.NO_LIQUIDITY:
      return 'limitOrder.errors.insufficientLiquidity'
    case OrderError.INVALID_APP_DATA:
    case OrderError.APP_DATA_HASH_MISMATCH:
    case OrderError.APPDATA_FROM_MISMATCH:
    case OrderError.DUPLICATED_ORDER:
    case OrderError.QUOTE_NOT_FOUND:
    case OrderError.QUOTE_NOT_VERIFIED:
    case OrderError.INVALID_QUOTE:
    case OrderError.MISSING_FROM:
    case OrderError.WRONG_OWNER:
    case OrderError.INVALID_EIP1271SIGNATURE:
    case OrderError.INVALID_SIGNATURE:
    case OrderError.SELL_AMOUNT_OVERFLOW:
    case OrderError.TRANSFER_SIMULATION_FAILED:
    case OrderError.INCOMPATIBLE_SIGNING_SCHEME:
    case OrderError.TOO_MANY_LIMIT_ORDERS:
    case OrderError.TOO_MUCH_GAS:
    case OrderError.UNSUPPORTED_BUY_TOKEN_DESTINATION:
    case OrderError.UNSUPPORTED_SELL_TOKEN_SOURCE:
    case OrderError.UNSUPPORTED_ORDER_TYPE:
      return 'trade.errors.quoteError'
    default:
      assertUnreachable(errorType)
  }
}

export const getMixpanelLimitOrderEventData = ({
  sellAsset,
  buyAsset,
  sellAmountCryptoPrecision,
  buyAmountCryptoPrecision,
}: {
  sellAsset: Asset | undefined
  buyAsset: Asset | undefined
  sellAmountCryptoPrecision: string
  buyAmountCryptoPrecision: string
}) => {
  // mixpanel paranoia seeing impossibly high values
  if (!sellAsset?.precision) return
  if (!buyAsset?.precision) return

  const state = store.getState() as ReduxState

  const buyAssetFeeAsset = selectFeeAssetById(state, buyAsset.assetId)
  const sellAssetFeeAsset = selectFeeAssetById(state, sellAsset.assetId)
  const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(state)
  const marketDataUsd = selectMarketDataUsd(state)
  const assets = selectAssets(state)

  const sellAmountBeforeFeesUsd = bn(sellAmountCryptoPrecision)
    .times(marketDataUsd[sellAsset.assetId]?.price ?? 0)
    .toString()
  const sellAmountBeforeFeesUserCurrency = bn(sellAmountBeforeFeesUsd)
    .times(userCurrencyToUsdRate)
    .toString()

  const feeParams = { feeModel: 'SWAPPER' as const, inputAmountUsd: sellAmountBeforeFeesUsd }
  const { feeUsd: shapeshiftFeeUsd } = selectCalculatedFees(state, feeParams)
  const shapeShiftFeeUserCurrency = bn(shapeshiftFeeUsd).times(userCurrencyToUsdRate).toString()

  const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
  const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)

  return {
    buyAsset: compositeBuyAsset,
    sellAsset: compositeSellAsset,
    buyAssetChain: buyAssetFeeAsset?.networkName,
    sellAssetChain: sellAssetFeeAsset?.networkName,
    amountUsd: sellAmountBeforeFeesUsd,
    amountUserCurrency: sellAmountBeforeFeesUserCurrency,
    shapeShiftFeeUserCurrency,
    shapeshiftFeeUsd,
    [compositeBuyAsset]: buyAmountCryptoPrecision,
    [compositeSellAsset]: sellAmountCryptoPrecision,
  }
}

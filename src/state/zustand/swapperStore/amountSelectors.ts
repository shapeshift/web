import { ethAssetId } from '@shapeshiftoss/caip'
import type { Selector } from 'reselect'
import { createSelector } from 'reselect'
import { TradeAmountInputField } from 'components/Trade/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { IntermediaryTransactionOutput } from 'lib/swapper/api'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectFeeAssetById,
  selectFiatToUsdRate,
  selectMarketDataById,
} from 'state/slices/selectors'
import { store } from 'state/store'
import {
  selectAction,
  selectAmount,
  selectBuyAsset,
  selectSelectedCurrencyToUsdRate,
  selectSellAmountFiat,
  selectSellAsset,
  selectSlippage,
  selectSwapperDefaultAffiliateBps,
} from 'state/zustand/swapperStore/selectors'
import type { SwapperState } from 'state/zustand/swapperStore/types'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

export const selectBuyAssetUsdRate = createSelector(
  selectBuyAsset,
  buyAsset => selectMarketDataById(store.getState(), buyAsset.assetId).price,
)

export const selectSellAssetUsdRate = createSelector(
  selectSellAsset,
  sellAsset => selectMarketDataById(store.getState(), sellAsset.assetId).price,
)

export const selectFeeAssetUsdRate = createSelector(selectSellAsset, sellAsset => {
  const feeAssetId = selectFeeAssetById(store.getState(), sellAsset.assetId ?? ethAssetId)?.assetId
  return feeAssetId ? selectMarketDataById(store.getState(), feeAssetId).price : '0'
})

export const selectSellAssetFiatRate = createSelector(selectSellAssetUsdRate, sellAssetUsdRate => {
  const selectedCurrencyToUsdRate = selectFiatToUsdRate(store.getState())
  return bnOrZero(sellAssetUsdRate).times(selectedCurrencyToUsdRate).toString()
})

export const selectBuyAssetFiatRate = createSelector(selectBuyAssetUsdRate, buyAssetUsdRate => {
  const selectedCurrencyToUsdRate = selectFiatToUsdRate(store.getState())
  return bnOrZero(buyAssetUsdRate).times(selectedCurrencyToUsdRate).toString()
})

export const selectFeeAssetFiatRate = createSelector(selectFeeAssetUsdRate, feeAssetUsdRate => {
  const selectedCurrencyToUsdRate = selectFiatToUsdRate(store.getState())
  return bnOrZero(feeAssetUsdRate).times(selectedCurrencyToUsdRate).toString()
})

const selectAssetPriceRatio = createSelector(
  selectBuyAssetFiatRate,
  selectSellAssetFiatRate,
  (buyAssetFiatRate, sellAssetFiatRate) => {
    return bnOrZero(buyAssetFiatRate)
      .dividedBy(sellAssetFiatRate ?? '1')
      .toFixed()
  },
)

export const selectSellAmountBeforeFeesBaseUnitByAction = createSelector(
  selectAction,
  selectAmount,
  (state: SwapperState) => state.sellAsset?.precision,
  selectSellAssetFiatRate,
  selectAssetPriceRatio,
  (action, amount, sellAssetPrecision, sellAssetFiatRate, assetPriceRatio): string => {
    if (!sellAssetPrecision || !sellAssetFiatRate) return '0'
    switch (action) {
      case TradeAmountInputField.BUY_CRYPTO:
        return toBaseUnit(bnOrZero(amount).times(assetPriceRatio), sellAssetPrecision)
      case TradeAmountInputField.SELL_CRYPTO:
        return toBaseUnit(amount, sellAssetPrecision)
      case TradeAmountInputField.BUY_FIAT:
      case TradeAmountInputField.SELL_FIAT:
        return toBaseUnit(bnOrZero(amount).dividedBy(sellAssetFiatRate), sellAssetPrecision)
      default:
        return '0'
    }
  },
)

export const selectSellAmountBeforeFeesCryptoPrecision = createSelector(
  selectSellAmountBeforeFeesBaseUnitByAction,
  (state: SwapperState) => state.sellAsset?.precision,
  (sellAmountBeforeFeesBaseUnit, sellAssetPrecision) => {
    if (!sellAssetPrecision) return undefined
    return fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAssetPrecision)
  },
)

export const selectBuyAmountBeforeFeesBaseUnit = createSelector(
  selectAction,
  selectAmount,
  (state: SwapperState) => state.buyAsset?.precision,
  selectBuyAssetFiatRate,
  selectAssetPriceRatio,
  (action, amount, buyAssetPrecision, buyAssetFiatRate, assetPriceRatio): string => {
    if (!buyAssetPrecision || !buyAssetFiatRate) return '0'
    switch (action) {
      case TradeAmountInputField.BUY_CRYPTO:
        return toBaseUnit(amount, buyAssetPrecision)
      case TradeAmountInputField.SELL_CRYPTO:
        return toBaseUnit(bnOrZero(amount).div(assetPriceRatio), buyAssetPrecision)
      case TradeAmountInputField.BUY_FIAT:
      case TradeAmountInputField.SELL_FIAT:
        return toBaseUnit(bnOrZero(amount).dividedBy(buyAssetFiatRate), buyAssetPrecision)
      default:
        return '0'
    }
  },
)

export const selectSellAmountBeforeFeesBuyAssetBaseUnit = createSelector(
  selectAssetPriceRatio,
  selectSellAmountBeforeFeesBaseUnitByAction,
  (state: SwapperState) => state.sellAsset?.precision,
  (state: SwapperState) => state.buyAsset?.precision,
  (
    assetPriceRatio,
    sellAmountBeforeFeesBaseUnit,
    sellAssetPrecision,
    buyAssetPrecision,
  ): string | undefined => {
    if (!sellAssetPrecision || !buyAssetPrecision) return undefined
    return toBaseUnit(
      fromBaseUnit(bnOrZero(sellAmountBeforeFeesBaseUnit).div(assetPriceRatio), sellAssetPrecision),
      buyAssetPrecision,
    ).toString()
  },
)

export const selectBuyAmountBeforeFeesBuyAssetCryptoPrecision = createSelector(
  selectBuyAmountBeforeFeesBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  (buyAmountBeforeFeesBaseUnit, buyAssetPrecision): string | undefined => {
    if (!buyAssetPrecision) return undefined
    return fromBaseUnit(buyAmountBeforeFeesBaseUnit, buyAssetPrecision)
  },
)

export const selectSellAssetTradeFeeSellAssetBaseUnit = createSelector(
  selectSellAssetFiatRate,
  selectSelectedCurrencyToUsdRate,
  (state: SwapperState) => state.fees?.sellAssetTradeFeeUsd,
  (state: SwapperState) => state.sellAsset?.precision,
  (
    sellAssetFiatRate,
    selectedCurrencyToUsdRate,
    sellAssetTradeFeeUsd,
    sellAssetPrecision,
  ): string | undefined => {
    if (!sellAssetFiatRate || !selectedCurrencyToUsdRate || !sellAssetPrecision) return undefined
    const sellAssetTradeFeeFiat = bnOrZero(sellAssetTradeFeeUsd).times(selectedCurrencyToUsdRate)
    return toBaseUnit(sellAssetTradeFeeFiat.div(sellAssetFiatRate), sellAssetPrecision)
  },
)

export const selectBuyAssetTradeFeeBuyAssetBaseUnit = createSelector(
  selectBuyAssetFiatRate,
  selectSelectedCurrencyToUsdRate,
  (state: SwapperState) => state.fees?.buyAssetTradeFeeUsd,
  (state: SwapperState) => state.buyAsset?.precision,
  (
    buyAssetFiatRate,
    selectedCurrencyToUsdRate,
    buyAssetTradeFeeUsd,
    buyAssetPrecision,
  ): string | undefined => {
    if (!buyAssetFiatRate || !selectedCurrencyToUsdRate || !buyAssetPrecision) return undefined
    const buyAssetTradeFeeFiat = bnOrZero(buyAssetTradeFeeUsd).times(selectedCurrencyToUsdRate)
    return toBaseUnit(buyAssetTradeFeeFiat.div(buyAssetFiatRate), buyAssetPrecision)
  },
)

export const selectSellAssetTradeFeeBuyAssetBaseUnit = createSelector(
  selectSellAssetTradeFeeSellAssetBaseUnit,
  selectAssetPriceRatio,
  (state: SwapperState) => state.sellAsset?.precision,
  (state: SwapperState) => state.buyAsset?.precision,
  (
    sellAssetTradeFeeSellAssetBaseUnit,
    assetPriceRatio,
    sellAssetPrecision,
    buyAssetPrecision,
  ): string | undefined => {
    if (!sellAssetTradeFeeSellAssetBaseUnit || !sellAssetPrecision || !buyAssetPrecision)
      return undefined
    return toBaseUnit(
      fromBaseUnit(
        bnOrZero(sellAssetTradeFeeSellAssetBaseUnit).div(assetPriceRatio),
        sellAssetPrecision,
      ),
      buyAssetPrecision,
    )
  },
)

export const selectBuyAssetTradeFeeSellAssetBaseUnit = createSelector(
  selectBuyAssetTradeFeeBuyAssetBaseUnit,
  selectAssetPriceRatio,
  (state: SwapperState) => state.sellAsset?.precision,
  (state: SwapperState) => state.buyAsset?.precision,
  (
    buyAssetTradeFeeBuyAssetBaseUnit,
    assetPriceRatio,
    sellAssetPrecision,
    buyAssetPrecision,
  ): string | undefined => {
    if (!buyAssetTradeFeeBuyAssetBaseUnit || !sellAssetPrecision || !buyAssetPrecision)
      return undefined
    return toBaseUnit(
      fromBaseUnit(
        bnOrZero(buyAssetTradeFeeBuyAssetBaseUnit).times(assetPriceRatio),
        buyAssetPrecision,
      ),
      sellAssetPrecision,
    )
  },
)

export const selectTotalTradeFeeSellAssetBaseUnit = createSelector(
  selectSellAssetTradeFeeSellAssetBaseUnit,
  selectBuyAssetTradeFeeSellAssetBaseUnit,
  (sellAssetTradeFeeSellAssetBaseUnit, buyAssetTradeFeeSellAssetBaseUnit): string | undefined => {
    if (!sellAssetTradeFeeSellAssetBaseUnit || !buyAssetTradeFeeSellAssetBaseUnit) return undefined
    return bnOrZero(sellAssetTradeFeeSellAssetBaseUnit)
      .plus(buyAssetTradeFeeSellAssetBaseUnit)
      .toString()
  },
)

export const selectTotalTradeFeeBuyAssetBaseUnit = createSelector(
  selectSellAssetTradeFeeBuyAssetBaseUnit,
  selectBuyAssetTradeFeeBuyAssetBaseUnit,
  (sellAssetTradeFeeBuyAssetBaseUnit, buyAssetTradeFeeBuyAssetBaseUnit): string | undefined => {
    if (!sellAssetTradeFeeBuyAssetBaseUnit || !buyAssetTradeFeeBuyAssetBaseUnit) return undefined
    return bnOrZero(sellAssetTradeFeeBuyAssetBaseUnit)
      .plus(buyAssetTradeFeeBuyAssetBaseUnit)
      .toString()
  },
)

export const selectTotalTradeFeeBuyAssetCryptoPrecision = createSelector(
  selectTotalTradeFeeBuyAssetBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  (totalTradeFeeBuyAssetBaseUnit, buyAssetPrecision): string | undefined => {
    if (!totalTradeFeeBuyAssetBaseUnit || !buyAssetPrecision) return undefined
    return fromBaseUnit(totalTradeFeeBuyAssetBaseUnit, buyAssetPrecision)
  },
)

export const selectSellAmountPlusFeesBaseUnit = createSelector(
  selectSellAmountBeforeFeesBaseUnitByAction,
  selectTotalTradeFeeSellAssetBaseUnit,
  (sellAmountBeforeFeesBaseUnit, totalTradeFeeSellAssetBaseUnit): string | undefined => {
    if (!sellAmountBeforeFeesBaseUnit || !totalTradeFeeSellAssetBaseUnit) return undefined
    return bnOrZero(sellAmountBeforeFeesBaseUnit).plus(totalTradeFeeSellAssetBaseUnit).toString()
  },
)

export const selectBuyAmountBeforeFeesFiat = createSelector(
  selectBuyAmountBeforeFeesBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  selectBuyAssetFiatRate,
  (buyAmountBeforeFeesBaseUnit, buyAssetPrecision, buyAssetFiatRate): string | undefined => {
    if (!buyAssetPrecision || !buyAssetFiatRate) return undefined
    return bnOrZero(fromBaseUnit(buyAmountBeforeFeesBaseUnit, buyAssetPrecision))
      .times(buyAssetFiatRate)
      .toFixed()
  },
)

export const selectSellAmountBeforeFeesFiat = createSelector(
  selectSellAmountBeforeFeesBaseUnitByAction,
  (state: SwapperState) => state.sellAsset?.precision,
  selectSellAssetFiatRate,
  (sellAmountBeforeFeesBaseUnit, sellAssetPrecision, sellAssetFiatRate): string | undefined => {
    if (!sellAssetPrecision || !sellAssetFiatRate) return undefined
    return bnOrZero(fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAssetPrecision))
      .times(sellAssetFiatRate)
      .toFixed()
  },
)

export const selectSellAmountPlusFeesFiat = createSelector(
  selectSellAmountPlusFeesBaseUnit,
  (state: SwapperState) => state.sellAsset?.precision,
  selectSellAssetFiatRate,
  (sellAmountPlusFeesBaseUnit, sellAssetPrecision, sellAssetFiatRate): string | undefined => {
    if (!sellAssetPrecision || !sellAssetFiatRate || !sellAmountPlusFeesBaseUnit) return undefined
    return bnOrZero(fromBaseUnit(sellAmountPlusFeesBaseUnit, sellAssetPrecision))
      .times(sellAssetFiatRate)
      .toFixed()
  },
)

export const selectTradeOrQuoteSellAmountBeforeFeesCryptoBaseUnit = createSelector(
  (state: SwapperState) =>
    state.activeSwapperWithMetadata?.quote?.sellAmountBeforeFeesCryptoBaseUnit,
  (state: SwapperState) => state.trade?.sellAmountBeforeFeesCryptoBaseUnit,
  (quoteSellAmountBeforeFeesBaseUnit, tradeSellAmountBeforeFeesBaseUnit): string | undefined =>
    // Use the trade amount if we have it, otherwise use the quote amount
    tradeSellAmountBeforeFeesBaseUnit ?? quoteSellAmountBeforeFeesBaseUnit,
)

export const selectTradeOrQuoteBuyAmountCryptoBaseUnit = createSelector(
  (state: SwapperState) =>
    state.activeSwapperWithMetadata?.quote?.buyAmountBeforeFeesCryptoBaseUnit,
  (state: SwapperState) => state.trade?.buyAmountBeforeFeesCryptoBaseUnit,
  (quoteBuyAmountBeforeFeesBaseUnit, tradeBuyAmountBeforeFeesBaseUnit): string | undefined =>
    // Use the trade amount if we have it, otherwise use the quote amount
    tradeBuyAmountBeforeFeesBaseUnit ?? quoteBuyAmountBeforeFeesBaseUnit,
)

export const selectQuoteSellAmountPlusFeesBaseUnit = createSelector(
  selectTradeOrQuoteSellAmountBeforeFeesCryptoBaseUnit,
  selectSellAssetTradeFeeSellAssetBaseUnit,
  (
    quoteSellAmountBeforeFeesSellAssetBaseUnit,
    sellAssetTradeFeeSellAssetBaseUnit,
  ): string | undefined => {
    if (!quoteSellAmountBeforeFeesSellAssetBaseUnit || !sellAssetTradeFeeSellAssetBaseUnit)
      return undefined
    return bnOrZero(quoteSellAmountBeforeFeesSellAssetBaseUnit)
      .plus(sellAssetTradeFeeSellAssetBaseUnit)
      .toFixed()
  },
)

export const selectQuoteSellAmountPlusFeesFiat = createSelector(
  selectQuoteSellAmountPlusFeesBaseUnit,
  (state: SwapperState) => state.sellAsset?.precision,
  selectSellAssetFiatRate,
  (quoteSellAmountPlusFeesBaseUnit, sellAssetPrecision, sellAssetFiatRate): string | undefined => {
    if (!sellAssetPrecision || !sellAssetFiatRate || !quoteSellAmountPlusFeesBaseUnit)
      return undefined
    return bnOrZero(fromBaseUnit(quoteSellAmountPlusFeesBaseUnit, sellAssetPrecision))
      .times(sellAssetFiatRate)
      .toFixed()
  },
)

export const selectBuyAmountAfterFeesBaseUnit = createSelector(
  selectSellAmountBeforeFeesBuyAssetBaseUnit,
  selectTotalTradeFeeBuyAssetBaseUnit,
  (sellAmountBeforeFeesBuyAssetBaseUnit, totalTradeFeeBuyAssetBaseUnit): string | undefined => {
    if (!sellAmountBeforeFeesBuyAssetBaseUnit || !totalTradeFeeBuyAssetBaseUnit) return undefined
    return bnOrZero(sellAmountBeforeFeesBuyAssetBaseUnit)
      .minus(totalTradeFeeBuyAssetBaseUnit)
      .toString()
  },
)

export const selectBuyAmountAfterFeesCryptoPrecision = createSelector(
  selectBuyAmountAfterFeesBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  (buyAmountAfterFeesBaseUnit, buyAssetPrecision): string | undefined => {
    if (!buyAssetPrecision || !buyAmountAfterFeesBaseUnit) return undefined
    return fromBaseUnit(buyAmountAfterFeesBaseUnit, buyAssetPrecision)
  },
)

export const selectBuyAmountAfterFeesFiat = createSelector(
  selectBuyAmountAfterFeesBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  selectBuyAssetFiatRate,
  (buyAmountAfterFeesBaseUnit, buyAssetPrecision, buyAssetFiatRate): string | undefined => {
    if (!buyAssetPrecision || !buyAssetFiatRate || !buyAmountAfterFeesBaseUnit) return undefined
    return bnOrZero(fromBaseUnit(buyAmountAfterFeesBaseUnit, buyAssetPrecision))
      .times(buyAssetFiatRate)
      .toFixed()
  },
)

export const selectQuoteBuyAmountCryptoPrecision = createSelector(
  selectTradeOrQuoteBuyAmountCryptoBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  (tradeOrQuoteBuyAmountCryptoBaseUnit, buyAssetPrecision): string | undefined => {
    if (!tradeOrQuoteBuyAmountCryptoBaseUnit || !buyAssetPrecision) return undefined
    return fromBaseUnit(tradeOrQuoteBuyAmountCryptoBaseUnit, buyAssetPrecision)
  },
)

export const selectQuoteBuyAmountFiat = createSelector(
  selectQuoteBuyAmountCryptoPrecision,
  selectBuyAssetFiatRate,
  (quoteBuyAmountCryptoPrecision, buyAssetFiatRate): string | undefined => {
    if (!quoteBuyAmountCryptoPrecision || !buyAssetFiatRate) return undefined
    return bnOrZero(quoteBuyAmountCryptoPrecision).times(buyAssetFiatRate).toFixed()
  },
)

type SelectTradeAmountsByActionAndAmountReturn = {
  buyAmountBuyAssetCryptoPrecision: string | undefined
  sellAmountSellAssetCryptoPrecision: string | undefined
  fiatBuyAmount: string | undefined
  fiatSellAmount: string | undefined
}

// Update amounts for the current action type (buy vs sell), as the fiat rates won't change
// Don't update the opposite action type, as we need to wait for a quote response to get an accurate value
export const selectTradeAmountsByActionAndAmount: Selector<
  SwapperState,
  SelectTradeAmountsByActionAndAmountReturn
> = createSelector(
  selectBuyAmountBeforeFeesFiat,
  selectSellAmountBeforeFeesFiat,
  selectSellAmountBeforeFeesCryptoPrecision,
  selectBuyAmountBeforeFeesBuyAssetCryptoPrecision,
  selectAmount,
  selectAction,
  selectSellAsset,
  selectBuyAsset,
  (
    buyAmountBeforeFeesFiat,
    sellAmountBeforeFeesFiat,
    sellAmountBeforeFeesCryptoPrecision,
    buyAmountBeforeFeesBuyAssetCryptoPrecision,
    amount,
    action,
    sellAsset,
    buyAsset,
  ) => {
    const defaultReturn: SelectTradeAmountsByActionAndAmountReturn = {
      buyAmountBuyAssetCryptoPrecision: '0',
      sellAmountSellAssetCryptoPrecision: '0',
      fiatSellAmount: '0',
      fiatBuyAmount: '0',
    }
    if (!sellAsset || !buyAsset) return defaultReturn
    switch (action) {
      // TODO: the 0's should be undefined
      case TradeAmountInputField.SELL_CRYPTO: {
        return {
          sellAmountSellAssetCryptoPrecision: amount,
          buyAmountBuyAssetCryptoPrecision: '0',
          fiatSellAmount: sellAmountBeforeFeesFiat,
          fiatBuyAmount: '0',
        }
      }
      case TradeAmountInputField.SELL_FIAT: {
        return {
          sellAmountSellAssetCryptoPrecision: sellAmountBeforeFeesCryptoPrecision,
          buyAmountBuyAssetCryptoPrecision: '0',
          fiatSellAmount: bnOrZero(amount).toFixed(),
          fiatBuyAmount: '0',
        }
      }
      case TradeAmountInputField.BUY_CRYPTO: {
        return {
          sellAmountSellAssetCryptoPrecision: '0',
          buyAmountBuyAssetCryptoPrecision: amount,
          fiatSellAmount: '0',
          fiatBuyAmount: buyAmountBeforeFeesFiat,
        }
      }
      case TradeAmountInputField.BUY_FIAT: {
        return {
          sellAmountSellAssetCryptoPrecision: '0',
          buyAmountBuyAssetCryptoPrecision: buyAmountBeforeFeesBuyAssetCryptoPrecision,
          fiatSellAmount: '0',
          fiatBuyAmount: bnOrZero(amount).toFixed(),
        }
      }
      default:
        return defaultReturn
    }
  },
)

export const selectQuoteBuyAmountAfterFeesBaseUnit = createSelector(
  selectBuyAssetTradeFeeBuyAssetBaseUnit,
  selectSellAssetTradeFeeBuyAssetBaseUnit,
  selectQuoteBuyAmountCryptoPrecision,
  (state: SwapperState) => state.buyAsset?.precision,
  (
    buyAssetTradeFeeBuyAssetBaseUnit,
    sellAssetTradeFeeBuyAssetBaseUnit,
    quoteBuyAmountCryptoPrecision,
    buyAssetPrecision,
  ): string | undefined => {
    if (
      !buyAssetTradeFeeBuyAssetBaseUnit ||
      !sellAssetTradeFeeBuyAssetBaseUnit ||
      !quoteBuyAmountCryptoPrecision ||
      !buyAssetPrecision
    )
      return undefined

    const quoteBuyAmountCryptoBaseUnit = toBaseUnit(
      quoteBuyAmountCryptoPrecision,
      buyAssetPrecision,
    )
    return bnOrZero(quoteBuyAmountCryptoBaseUnit)
      .minus(buyAssetTradeFeeBuyAssetBaseUnit)
      .minus(sellAssetTradeFeeBuyAssetBaseUnit)
      .toFixed()
  },
)

export const selectQuoteBuyAmountAfterFeesCryptoPrecision = createSelector(
  selectQuoteBuyAmountAfterFeesBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  (quoteBuyAmountAfterFeesBaseUnit, buyAssetPrecision): string | undefined => {
    if (!quoteBuyAmountAfterFeesBaseUnit || !buyAssetPrecision) return undefined
    return fromBaseUnit(quoteBuyAmountAfterFeesBaseUnit, buyAssetPrecision)
  },
)

export const selectQuoteBuyAmountAfterFeesFiat = createSelector(
  selectQuoteBuyAmountAfterFeesCryptoPrecision,
  selectBuyAssetFiatRate,
  (quoteBuyAmountAfterFeesCryptoPrecision, buyAssetFiatRate): string | undefined => {
    if (!quoteBuyAmountAfterFeesCryptoPrecision || !buyAssetFiatRate) return undefined
    return bnOrZero(quoteBuyAmountAfterFeesCryptoPrecision).times(buyAssetFiatRate).toFixed()
  },
)

export const selectTradeAmountsByActionAndAmountFromQuote: Selector<
  SwapperState,
  SelectTradeAmountsByActionAndAmountReturn
> = createSelector(
  selectBuyAmountBeforeFeesFiat,
  selectSellAmountBeforeFeesFiat,
  selectBuyAmountAfterFeesFiat,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectSellAmountBeforeFeesCryptoPrecision,
  selectBuyAmountBeforeFeesBuyAssetCryptoPrecision,
  selectAction,
  selectSellAsset,
  selectBuyAsset,
  selectAmount,
  selectQuoteSellAmountPlusFeesBaseUnit,
  selectQuoteSellAmountPlusFeesFiat,
  selectQuoteBuyAmountAfterFeesCryptoPrecision,
  selectQuoteBuyAmountAfterFeesFiat,
  selectSlippage,
  (
    buyAmountBeforeFeesFiat,
    sellAmountBeforeFeesFiat,
    buyAmountAfterFeesFiat,
    buyAmountAfterFeesCryptoPrecision,
    sellAmountBeforeFeesCryptoPrecision,
    buyAmountBeforeFeesCryptoPrecision,
    action,
    sellAsset,
    buyAsset,
    amount,
    quoteSellAmountPlusFeesBaseUnit,
    quoteSellAmountPlusFeesFiat,
    quoteBuyAmountAfterFeesCryptoPrecision,
    quoteBuyAmountAfterFeesFiat,
    slippage,
  ) => {
    const defaultReturn: SelectTradeAmountsByActionAndAmountReturn = {
      buyAmountBuyAssetCryptoPrecision: '0',
      sellAmountSellAssetCryptoPrecision: '0',
      fiatSellAmount: '0',
      fiatBuyAmount: '0',
    }
    if (!sellAsset || !buyAsset || bnOrZero(amount).lte(0)) return defaultReturn
    const quoteBuyAmountAfterFeesAndSlippageCryptoPrecision = bnOrZero(
      quoteBuyAmountAfterFeesCryptoPrecision,
    )
      .times(bn(1).minus(slippage))
      .toFixed()
    switch (action) {
      case TradeAmountInputField.SELL_CRYPTO: {
        return {
          sellAmountSellAssetCryptoPrecision: amount,
          buyAmountBuyAssetCryptoPrecision: quoteBuyAmountAfterFeesAndSlippageCryptoPrecision,
          fiatSellAmount: sellAmountBeforeFeesFiat,
          fiatBuyAmount: quoteBuyAmountAfterFeesFiat,
        }
      }
      case TradeAmountInputField.SELL_FIAT: {
        return {
          sellAmountSellAssetCryptoPrecision: sellAmountBeforeFeesCryptoPrecision,
          buyAmountBuyAssetCryptoPrecision: quoteBuyAmountAfterFeesAndSlippageCryptoPrecision,
          fiatSellAmount: amount,
          fiatBuyAmount: quoteBuyAmountAfterFeesFiat,
        }
      }
      case TradeAmountInputField.BUY_CRYPTO: {
        return {
          sellAmountSellAssetCryptoPrecision: fromBaseUnit(
            quoteSellAmountPlusFeesBaseUnit ?? '0',
            sellAsset.precision,
          ), // todo: should be quoteSellAmountAfterFeesCryptoPrecision
          buyAmountBuyAssetCryptoPrecision: buyAmountAfterFeesCryptoPrecision,
          fiatSellAmount: quoteSellAmountPlusFeesFiat,
          fiatBuyAmount: buyAmountBeforeFeesFiat,
        }
      }
      case TradeAmountInputField.BUY_FIAT: {
        return {
          sellAmountSellAssetCryptoPrecision: fromBaseUnit(
            quoteSellAmountPlusFeesBaseUnit ?? '0',
            sellAsset.precision,
          ),
          buyAmountBuyAssetCryptoPrecision: buyAmountBeforeFeesCryptoPrecision,
          fiatSellAmount: quoteSellAmountPlusFeesFiat,
          fiatBuyAmount: buyAmountAfterFeesFiat,
        }
      }
      default:
        return defaultReturn
    }
  },
)

export const selectDonationAmountFiat = createSelector(
  selectSellAmountFiat,
  selectSwapperDefaultAffiliateBps,
  (sellAmountFiat, defaultAffiliateBps): string => {
    const affiliatePercentage = convertBasisPointsToDecimalPercentage(defaultAffiliateBps)
    // The donation amount is a percentage of the sell amount
    return bnOrZero(sellAmountFiat).times(affiliatePercentage).toFixed()
  },
)

export const selectIntermediaryTransactionOutputs = createDeepEqualOutputSelector(
  (state: SwapperState) => state.activeSwapperWithMetadata?.quote?.intermediaryTransactionOutputs,
  (state: SwapperState) => state.trade?.intermediaryTransactionOutputs,
  (
    quoteIntermediaryTransactionOutputs,
    tradeIntermediaryTransactionOutputs,
  ): IntermediaryTransactionOutput[] | undefined =>
    // Use the trade amount if we have it, otherwise use the quote amount
    tradeIntermediaryTransactionOutputs ?? quoteIntermediaryTransactionOutputs,
)

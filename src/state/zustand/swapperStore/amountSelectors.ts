import type { Selector } from 'reselect'
import { createSelector } from 'reselect'
import { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { SwapperState } from 'state/zustand/swapperStore/types'

const selectAssetPriceRatio = createSelector(
  (state: SwapperState) => state.buyAssetFiatRate,
  (state: SwapperState) => state.sellAssetFiatRate,
  (buyAssetFiatRate, sellAssetFiatRate) => {
    return bnOrZero(buyAssetFiatRate).dividedBy(bnOrZero(sellAssetFiatRate)).toFixed()
  },
)

export const selectSellAmountBeforeFeesBaseUnitByAction = createSelector(
  (state: SwapperState) => state.action,
  (state: SwapperState) => state.amount,
  (state: SwapperState) => state.sellAsset?.precision,
  (state: SwapperState) => state.sellAssetFiatRate,
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

export const selectBuyAmountBeforeFeesBaseUnit = createSelector(
  (state: SwapperState) => state.action,
  (state: SwapperState) => state.amount,
  (state: SwapperState) => state.buyAsset?.precision,
  (state: SwapperState) => state.buyAssetFiatRate,
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
  (assetPriceRatio, sellAmountBeforeFeesBaseUnit, sellAssetPrecision): string | undefined => {
    if (!sellAssetPrecision) return undefined
    return bnOrZero(sellAmountBeforeFeesBaseUnit).div(assetPriceRatio).toString()
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
  (state: SwapperState) => state.sellAssetFiatRate,
  (state: SwapperState) => state.selectedCurrencyToUsdRate,
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
  (state: SwapperState) => state.sellAssetFiatRate,
  (state: SwapperState) => state.selectedCurrencyToUsdRate,
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
  (state: SwapperState) => state.buyAssetFiatRate,
  (buyAmountBeforeFeesBaseUnit, buyAssetPrecision, buyAssetFiatRate): string | undefined => {
    if (!buyAssetPrecision || !buyAssetFiatRate) return undefined
    return bnOrZero(fromBaseUnit(buyAmountBeforeFeesBaseUnit, buyAssetPrecision))
      .times(buyAssetFiatRate)
      .toFixed(2)
  },
)

export const selectSellAmountBeforeFeesFiat = createSelector(
  selectSellAmountBeforeFeesBaseUnitByAction,
  (state: SwapperState) => state.sellAsset?.precision,
  (state: SwapperState) => state.sellAssetFiatRate,
  (sellAmountBeforeFeesBaseUnit, sellAssetPrecision, sellAssetFiatRate): string | undefined => {
    if (!sellAssetPrecision || !sellAssetFiatRate) return undefined
    return bnOrZero(fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAssetPrecision))
      .times(sellAssetFiatRate)
      .toFixed(2)
  },
)

export const selectSellAmountPlusFeesFiat = createSelector(
  selectSellAmountPlusFeesBaseUnit,
  (state: SwapperState) => state.sellAsset?.precision,
  (state: SwapperState) => state.sellAssetFiatRate,
  (sellAmountPlusFeesBaseUnit, sellAssetPrecision, sellAssetFiatRate): string | undefined => {
    if (!sellAssetPrecision || !sellAssetFiatRate || !sellAmountPlusFeesBaseUnit) return undefined
    return bnOrZero(fromBaseUnit(sellAmountPlusFeesBaseUnit, sellAssetPrecision))
      .times(sellAssetFiatRate)
      .toFixed(2)
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

export const selectBuyAmountAfterFeesFiat = createSelector(
  selectBuyAmountAfterFeesBaseUnit,
  (state: SwapperState) => state.buyAsset?.precision,
  (state: SwapperState) => state.buyAssetFiatRate,
  (buyAmountAfterFeesBaseUnit, buyAssetPrecision, buyAssetFiatRate): string | undefined => {
    if (!buyAssetPrecision || !buyAssetFiatRate || !buyAmountAfterFeesBaseUnit) return undefined
    return bnOrZero(fromBaseUnit(buyAmountAfterFeesBaseUnit, buyAssetPrecision))
      .times(buyAssetFiatRate)
      .toFixed(2)
  },
)

type SelectTradeAmountsByActionAndAmountReturn = {
  buyAmountBuyAssetBaseUnit: string | undefined
  sellAmountSellAssetBaseUnit: string | undefined
  fiatBuyAmount: string | undefined
  fiatSellAmount: string | undefined
}

export const selectTradeAmountsByActionAndAmount: Selector<
  SwapperState,
  SelectTradeAmountsByActionAndAmountReturn
> = createSelector(
  selectBuyAmountBeforeFeesFiat,
  selectSellAmountBeforeFeesFiat,
  selectSellAmountPlusFeesFiat,
  selectBuyAmountAfterFeesFiat,
  selectBuyAmountAfterFeesBaseUnit,
  selectSellAmountBeforeFeesBaseUnitByAction,
  selectSellAmountPlusFeesBaseUnit,
  selectBuyAmountBeforeFeesBaseUnit,
  (state: SwapperState) => state.amount,
  (state: SwapperState) => state.action,
  (state: SwapperState) => state.sellAsset,
  (state: SwapperState) => state.buyAsset,
  (
    buyAmountBeforeFeesFiat,
    sellAmountBeforeFeesFiat,
    sellAmountPlusFeesFiat,
    buyAmountAfterFeesFiat,
    buyAmountAfterFeesBaseUnit,
    sellAmountBeforeFeesBaseUnit,
    sellAmountPlusFeesBaseUnit,
    buyAmountBeforeFeesBaseUnit,
    amount,
    action,
    sellAsset,
    buyAsset,
  ) => {
    const defaultReturn: SelectTradeAmountsByActionAndAmountReturn = {
      sellAmountSellAssetBaseUnit: '0',
      buyAmountBuyAssetBaseUnit: '0',
      fiatSellAmount: '0',
      fiatBuyAmount: '0',
    }
    if (!sellAsset || !buyAsset) return defaultReturn
    switch (action) {
      case TradeAmountInputField.SELL_CRYPTO: {
        return {
          sellAmountSellAssetBaseUnit: toBaseUnit(amount, sellAsset.precision),
          buyAmountBuyAssetBaseUnit: buyAmountAfterFeesBaseUnit,
          fiatSellAmount: sellAmountBeforeFeesFiat,
          fiatBuyAmount: buyAmountAfterFeesFiat,
        }
      }
      case TradeAmountInputField.SELL_FIAT: {
        return {
          sellAmountSellAssetBaseUnit: sellAmountBeforeFeesBaseUnit,
          buyAmountBuyAssetBaseUnit: buyAmountAfterFeesBaseUnit,
          fiatSellAmount: bnOrZero(amount).toFixed(2),
          fiatBuyAmount: buyAmountAfterFeesFiat,
        }
      }
      case TradeAmountInputField.BUY_CRYPTO: {
        return {
          sellAmountSellAssetBaseUnit: sellAmountPlusFeesBaseUnit,
          buyAmountBuyAssetBaseUnit: toBaseUnit(amount, buyAsset.precision),
          fiatSellAmount: sellAmountPlusFeesFiat,
          fiatBuyAmount: buyAmountBeforeFeesFiat,
        }
      }
      case TradeAmountInputField.BUY_FIAT: {
        return {
          sellAmountSellAssetBaseUnit: sellAmountPlusFeesBaseUnit,
          buyAmountBuyAssetBaseUnit: buyAmountBeforeFeesBaseUnit,
          fiatSellAmount: sellAmountPlusFeesFiat,
          fiatBuyAmount: bnOrZero(amount).toFixed(2),
        }
      }
      default:
        return defaultReturn
    }
  },
)

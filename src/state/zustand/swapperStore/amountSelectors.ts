import type { Selector } from 'reselect'
import { createSelector } from 'reselect'
import { TradeAmountInputField } from 'components/Trade/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { AmountDisplayMeta } from 'lib/swapper/api'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { getFeeAssetByAssetId } from 'state/slices/assetsSlice/utils'
import { selectAssets, selectCryptoMarketData, selectFiatToUsdRate } from 'state/slices/selectors'
import { store } from 'state/store'
import {
  selectAction,
  selectActiveSwapperWithMetadata,
  selectAmount,
  selectBuyAsset,
  selectProtocolFees,
  selectSellAmountFiat,
  selectSellAsset,
  selectSlippage,
  selectSwapperDefaultAffiliateBps,
} from 'state/zustand/swapperStore/selectors'
import type { SwapperState } from 'state/zustand/swapperStore/types'
import {
  convertBasisPointsToDecimalPercentage,
  sumProtocolFeesToDenom,
} from 'state/zustand/swapperStore/utils'

const selectCryptoMarketDataById = () => selectCryptoMarketData(store.getState())
const selectAssetsById = () => selectAssets(store.getState())
const selectSelectedCurrencyToUsdRate = () => selectFiatToUsdRate(store.getState()) ?? '0'

export const selectBuyAssetUsdRate = createSelector(
  selectBuyAsset,
  selectCryptoMarketDataById,
  (buyAsset, cryptoMarketDataById) => cryptoMarketDataById[buyAsset.assetId]?.price ?? '0',
)

export const selectSellAssetUsdRate = createSelector(
  selectSellAsset,
  selectCryptoMarketDataById,
  (sellAsset, cryptoMarketDataById) => cryptoMarketDataById[sellAsset.assetId]?.price ?? '0',
)

const selectFeeAssetId = createSelector(
  selectSellAsset,
  selectAssetsById,
  (sellAsset, assetsById) => getFeeAssetByAssetId(assetsById, sellAsset.assetId)?.assetId,
)

export const selectFeeAssetUsdRate = createSelector(
  selectFeeAssetId,
  selectCryptoMarketDataById,
  (feeAssetId, cryptoMarketDataById) => {
    return feeAssetId ? cryptoMarketDataById[feeAssetId]?.price ?? '0' : '0'
  },
)

export const selectSellAssetFiatRate = createSelector(
  selectSelectedCurrencyToUsdRate,
  selectSellAssetUsdRate,
  (selectedCurrencyToUsdRate, sellAssetUsdRate) => {
    return bnOrZero(sellAssetUsdRate).times(selectedCurrencyToUsdRate).toString()
  },
)

export const selectBuyAssetFiatRate = createSelector(
  selectSelectedCurrencyToUsdRate,
  selectBuyAssetUsdRate,
  (selectedCurrencyToUsdRate, buyAssetUsdRate) => {
    return bnOrZero(buyAssetUsdRate).times(selectedCurrencyToUsdRate).toString()
  },
)

export const selectFeeAssetFiatRate = createSelector(
  selectSelectedCurrencyToUsdRate,
  selectFeeAssetUsdRate,
  (selectedCurrencyToUsdRate, feeAssetUsdRate) => {
    return bnOrZero(feeAssetUsdRate).times(selectedCurrencyToUsdRate).toString()
  },
)

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

export const selectTotalTradeFeeBuyAssetBaseUnit = createSelector(
  selectProtocolFees,
  selectCryptoMarketDataById,
  selectBuyAssetUsdRate,
  selectBuyAsset,
  (protocolFees, cryptoMarketDataById, outputAssetPriceUsd, buyAsset) => {
    if (protocolFees === undefined) return '0'
    return sumProtocolFeesToDenom({
      cryptoMarketDataById,
      protocolFees,
      outputAssetPriceUsd,
      outputExponent: buyAsset.precision,
    })
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

export const selectTradeOrQuoteSellAmountBeforeFeesCryptoBaseUnit = createSelector(
  selectActiveSwapperWithMetadata,
  (state: SwapperState) => state.trade?.sellAmountBeforeFeesCryptoBaseUnit,
  (activeSwapperWithMetadata, tradeSellAmountBeforeFeesBaseUnit): string | undefined =>
    // Use the trade amount if we have it, otherwise use the quote amount
    tradeSellAmountBeforeFeesBaseUnit ??
    activeSwapperWithMetadata?.quote?.steps[0].sellAmountBeforeFeesCryptoBaseUnit,
)

export const selectTradeOrQuoteBuyAmountCryptoBaseUnit = createSelector(
  selectActiveSwapperWithMetadata,
  (state: SwapperState) => state.trade?.buyAmountBeforeFeesCryptoBaseUnit,
  (activeSwapperWithMetadata, tradeBuyAmountBeforeFeesBaseUnit): string | undefined =>
    // Use the trade amount if we have it, otherwise use the quote amount
    tradeBuyAmountBeforeFeesBaseUnit ??
    activeSwapperWithMetadata?.quote?.steps[0].buyAmountBeforeFeesCryptoBaseUnit,
)

// used to compute the gross sell amount based on the quote
// needs to add the protocol fee for the sell asset
export const selectQuoteSellAmountPlusFeesBaseUnit = createSelector(
  selectTradeOrQuoteSellAmountBeforeFeesCryptoBaseUnit,
  selectProtocolFees,
  selectSellAsset,
  (quoteSellAmountBeforeFeesSellAssetBaseUnit, protocolFees, sellAsset): string | undefined => {
    if (!quoteSellAmountBeforeFeesSellAssetBaseUnit) return undefined
    return bnOrZero(quoteSellAmountBeforeFeesSellAssetBaseUnit)
      .plus(protocolFees?.[sellAsset.assetId]?.amountCryptoBaseUnit ?? 0)
      .toFixed(0)
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

// used to compute the net buy amount based on the user input and fees
// needs to deduct to the total of all protocol fees
export const selectBuyAmountAfterFeesBaseUnit = createSelector(
  selectSellAmountBeforeFeesBuyAssetBaseUnit,
  selectTotalTradeFeeBuyAssetBaseUnit,
  (sellAmountBeforeFeesBuyAssetBaseUnit, totalTradeFeeBuyAssetBaseUnit): string | undefined => {
    if (!sellAmountBeforeFeesBuyAssetBaseUnit) return undefined
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
  selectBuyAsset,
  (tradeOrQuoteBuyAmountCryptoBaseUnit, buyAsset): string | undefined => {
    if (!tradeOrQuoteBuyAmountCryptoBaseUnit) return undefined
    return fromBaseUnit(tradeOrQuoteBuyAmountCryptoBaseUnit, buyAsset.precision)
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

// used to compute the net buy amount based on the quote
// needs to deduct to the total of all protocol fees
export const selectQuoteBuyAmountAfterFeesBaseUnit = createSelector(
  selectTradeOrQuoteBuyAmountCryptoBaseUnit,
  selectTotalTradeFeeBuyAssetBaseUnit,
  (quoteBuyAmountCryptoBaseUnit, totalTradeFeeBuyAssetBaseUnit): string | undefined => {
    if (!quoteBuyAmountCryptoBaseUnit) return undefined
    return bnOrZero(quoteBuyAmountCryptoBaseUnit).minus(totalTradeFeeBuyAssetBaseUnit).toFixed()
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
  selectActiveSwapperWithMetadata,
  (state: SwapperState) => state.trade?.intermediaryTransactionOutputs,
  (
    activeSwapperWithMetadata,
    tradeIntermediaryTransactionOutputs,
  ): AmountDisplayMeta[] | undefined =>
    // Use the trade amount if we have it, otherwise use the quote amount
    tradeIntermediaryTransactionOutputs ??
    activeSwapperWithMetadata?.quote.steps[0].intermediaryTransactionOutputs,
)

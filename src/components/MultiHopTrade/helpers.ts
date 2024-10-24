import { isThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuoteOrRate/getTradeQuoteOrRate'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import type { ReduxState } from 'state/reducer'
import { selectAssets, selectFeeAssetById } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHopSellAsset,
  selectLastHopBuyAsset,
  selectQuoteSellAmountBeforeFeesCryptoPrecision,
  selectQuoteSellAmountUsd,
  selectQuoteSellAmountUserCurrency,
  selectTradeQuoteAffiliateFeeAfterDiscountUsd,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { store } from 'state/store'

export const getMixpanelEventData = () => {
  const state = store.getState() as ReduxState

  const sellAsset = selectFirstHopSellAsset(state)
  const buyAsset = selectLastHopBuyAsset(state)
  const buyAssetFeeAsset = selectFeeAssetById(state, buyAsset?.assetId ?? '')
  const sellAssetFeeAsset = selectFeeAssetById(state, sellAsset?.assetId ?? '')

  // mixpanel paranoia seeing impossibly high values
  if (!sellAsset?.precision) return
  if (!buyAsset?.precision) return

  const assets = selectAssets(state)
  const shapeShiftFeeUserCurrency = selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency(state)
  const shapeshiftFeeUsd = selectTradeQuoteAffiliateFeeAfterDiscountUsd(state)
  const sellAmountBeforeFeesUsd = selectQuoteSellAmountUsd(state)
  const sellAmountBeforeFeesUserCurrency = selectQuoteSellAmountUserCurrency(state)
  const buyAmountBeforeFeesCryptoPrecision = selectBuyAmountBeforeFeesCryptoPrecision(state)
  const sellAmountBeforeFeesCryptoPrecision = selectQuoteSellAmountBeforeFeesCryptoPrecision(state)
  const swapperName = selectActiveSwapperName(state)
  const activeQuote = selectActiveQuote(state)

  const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
  const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)

  return {
    buyAsset: compositeBuyAsset,
    sellAsset: compositeSellAsset,
    buyAssetChain: buyAssetFeeAsset?.networkName,
    sellAssetChain: sellAssetFeeAsset?.networkName,
    amountUsd: sellAmountBeforeFeesUsd,
    amountUserCurrency: sellAmountBeforeFeesUserCurrency,
    swapperName,
    shapeShiftFeeUserCurrency,
    shapeshiftFeeUsd,
    [compositeBuyAsset]: buyAmountBeforeFeesCryptoPrecision,
    [compositeSellAsset]: sellAmountBeforeFeesCryptoPrecision,
    isStreaming: activeQuote?.isStreaming ?? false,
    isLongtail: activeQuote?.isLongtail ?? false,
    tradeType: isThorTradeQuote(activeQuote) ? activeQuote?.tradeType : null,
  }
}

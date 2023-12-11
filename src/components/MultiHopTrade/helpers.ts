import { SwapperName } from '@shapeshiftoss/swapper'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import type { ReduxState } from 'state/reducer'
import { selectAssets, selectFeeAssetById, selectWillDonate } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHopSellAsset,
  selectLastHopBuyAsset,
  selectQuoteDonationAmountUserCurrency,
  selectQuoteFeeAmountUsd,
  selectSellAmountBeforeFeesCryptoPrecision,
  selectSellAmountUsd,
  selectSellAmountUserCurrency,
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
  const _donationAmountUserCurrency = selectQuoteDonationAmountUserCurrency(state)
  const _donationAmountUsd = selectQuoteFeeAmountUsd(state)
  const sellAmountBeforeFeesUsd = selectSellAmountUsd(state)
  const sellAmountBeforeFeesUserCurrency = selectSellAmountUserCurrency(state)
  const buyAmountBeforeFeesCryptoPrecision = selectBuyAmountBeforeFeesCryptoPrecision(state)
  const sellAmountBeforeFeesCryptoPrecision = selectSellAmountBeforeFeesCryptoPrecision(state)
  const willDonate = selectWillDonate(state)
  const swapperName = selectActiveSwapperName(state)
  const activeQuote = selectActiveQuote(state)

  const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
  const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)

  const {
    shapeShiftFeeUserCurrency,
    shapeshiftFeeUsd,
    donationAmountUserCurrency,
    donationAmountUsd,
  } = (() => {
    if (swapperName === SwapperName.Thorchain) {
      return {
        shapeshiftFeeUsd: _donationAmountUsd,
        shapeShiftFeeUserCurrency: _donationAmountUserCurrency,
        donationAmountUsd: undefined,
        donationAmountUserCurrency: undefined,
      }
    }

    return {
      shapeshiftFeeUsd: undefined,
      shapeShiftFeeUserCurrency: undefined,
      donationAmountUsd: _donationAmountUsd,
      donationAmountUserCurrency: _donationAmountUserCurrency,
    }
  })()

  return {
    buyAsset: compositeBuyAsset,
    sellAsset: compositeSellAsset,
    buyAssetChain: buyAssetFeeAsset?.networkName,
    sellAssetChain: sellAssetFeeAsset?.networkName,
    amountUsd: sellAmountBeforeFeesUsd,
    amountUserCurrency: sellAmountBeforeFeesUserCurrency,
    swapperName,
    hasUserOptedOutOfDonation: !willDonate,
    donationAmountUsd,
    donationAmountUserCurrency,
    shapeShiftFeeUserCurrency,
    shapeshiftFeeUsd,
    [compositeBuyAsset]: buyAmountBeforeFeesCryptoPrecision,
    [compositeSellAsset]: sellAmountBeforeFeesCryptoPrecision,
    isStreaming: activeQuote?.isStreaming ?? false,
  }
}

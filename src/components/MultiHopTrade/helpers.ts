import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import type { ReduxState } from 'state/reducer'
import { selectAssets, selectWillDonate } from 'state/slices/selectors'
import {
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHopSellAsset,
  selectLastHopBuyAsset,
  selectQuoteDonationAmountUserCurrency,
  selectSellAmountBeforeFeesCryptoPrecision,
  selectSellAmountUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { store } from 'state/store'

export const getMixpanelEventData = () => {
  const state = store.getState() as ReduxState

  const sellAsset = selectFirstHopSellAsset(state)
  const buyAsset = selectLastHopBuyAsset(state)

  // mixpanel paranoia seeing impossibly high values
  if (!sellAsset?.precision) return
  if (!buyAsset?.precision) return

  const assets = selectAssets(state)
  const donationAmountUserCurrency = selectQuoteDonationAmountUserCurrency(state)
  const sellAmountBeforeFeesFiat = selectSellAmountUserCurrency(state)
  const buyAmountBeforeFeesCryptoPrecision = selectBuyAmountBeforeFeesCryptoPrecision(state)
  const sellAmountBeforeFeesCryptoPrecision = selectSellAmountBeforeFeesCryptoPrecision(state)
  const willDonate = selectWillDonate(state)
  const swapperName = selectActiveSwapperName(state)

  const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
  const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)

  return {
    buyAsset: compositeBuyAsset,
    sellAsset: compositeSellAsset,
    fiatAmount: sellAmountBeforeFeesFiat,
    swapperName,
    hasUserOptedOutOfDonation: !willDonate,
    donationAmountFiat: donationAmountUserCurrency,
    [compositeBuyAsset]: buyAmountBeforeFeesCryptoPrecision,
    [compositeSellAsset]: sellAmountBeforeFeesCryptoPrecision,
  }
}

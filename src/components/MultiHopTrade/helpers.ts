import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import type { Swapper2, Swapper2Api } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper2'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper2'
import { osmosisApi } from 'lib/swapper/swappers/OsmosisSwapper/endpoints'
import { osmosisSwapper } from 'lib/swapper/swappers/OsmosisSwapper/OsmosisSwapper2'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { assertUnreachable } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { selectAssets, selectWillDonate } from 'state/slices/selectors'
import {
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHopSellAsset,
  selectLastHopBuyAsset,
  selectQuoteDonationAmountUsd,
  selectQuoteDonationAmountUserCurrency,
  selectSellAmountBeforeFeesCryptoPrecision,
  selectSellAmountUsd,
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
  const donationAmountUsd = selectQuoteDonationAmountUsd(state)
  const sellAmountBeforeFeesUsd = selectSellAmountUsd(state)
  const sellAmountBeforeFeesUserCurrency = selectSellAmountUserCurrency(state)
  const buyAmountBeforeFeesCryptoPrecision = selectBuyAmountBeforeFeesCryptoPrecision(state)
  const sellAmountBeforeFeesCryptoPrecision = selectSellAmountBeforeFeesCryptoPrecision(state)
  const willDonate = selectWillDonate(state)
  const swapperName = selectActiveSwapperName(state)

  const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
  const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)

  return {
    buyAsset: compositeBuyAsset,
    sellAsset: compositeSellAsset,
    amountUsd: sellAmountBeforeFeesUsd,
    amountUserCurrency: sellAmountBeforeFeesUserCurrency,
    swapperName,
    hasUserOptedOutOfDonation: !willDonate,
    donationAmountUsd,
    donationAmountUserCurrency,
    [compositeBuyAsset]: buyAmountBeforeFeesCryptoPrecision,
    [compositeSellAsset]: sellAmountBeforeFeesCryptoPrecision,
  }
}

export const getSwapperBySwapperName = (swapperName: SwapperName): Swapper2 & Swapper2Api => {
  switch (swapperName) {
    case SwapperName.LIFI:
      return { ...lifiSwapper, ...lifiApi }
    case SwapperName.Thorchain:
      return { ...thorchainSwapper, ...thorchainApi }
    case SwapperName.Zrx:
      return { ...zrxSwapper, ...zrxApi }
    case SwapperName.CowSwap:
      return { ...cowSwapper, ...cowApi }
    case SwapperName.OneInch:
      return { ...oneInchSwapper, ...oneInchApi }
    case SwapperName.Osmosis:
      return { ...osmosisSwapper, ...osmosisApi }
    case SwapperName.Test:
      throw Error('not implemented')
    default:
      assertUnreachable(swapperName)
  }
}

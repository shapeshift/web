import type { AssetId } from '@shapeshiftoss/caip'
import type { AmountDisplayMeta } from '@shapeshiftoss/swapper'
import { isExecutableTradeQuote, isThorTradeQuote, isThorTradeRate } from '@shapeshiftoss/swapper'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'

import { calculateFeeUsd } from '@/lib/fees/utils'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import { chainIdToChainDisplayName } from '@/lib/utils'
import type { ReduxState } from '@/state/reducer'
import { selectAssets, selectFeeAssetById } from '@/state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHopSellAsset,
  selectIsQuickBuy,
  selectLastHopBuyAsset,
  selectQuoteSellAmountBeforeFeesCryptoPrecision,
  selectQuoteSellAmountUsd,
  selectQuoteSellAmountUserCurrency,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { store } from '@/state/store'

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
  const quoteSellAmountUsd = selectQuoteSellAmountUsd(state)
  const shapeshiftFeeUsd = calculateFeeUsd({
    inputAmountUsd: bnOrZero(quoteSellAmountUsd),
  })
  const sellAmountBeforeFeesUserCurrency = selectQuoteSellAmountUserCurrency(state)
  const buyAmountBeforeFeesCryptoPrecision = selectBuyAmountBeforeFeesCryptoPrecision(state)
  const sellAmountBeforeFeesCryptoPrecision = selectQuoteSellAmountBeforeFeesCryptoPrecision(state)
  const swapperName = selectActiveSwapperName(state)
  const activeQuote = selectActiveQuote(state)
  const isQuickBuy = selectIsQuickBuy(state)

  const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
  const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)

  const tradeType = (() => {
    if (!activeQuote) return null
    if (isExecutableTradeQuote(activeQuote))
      return isThorTradeQuote(activeQuote) ? activeQuote.tradeType : null
    return isThorTradeRate(activeQuote) ? activeQuote.tradeType : null
  })()

  return {
    buyAsset: compositeBuyAsset,
    sellAsset: compositeSellAsset,
    buyAssetChain: buyAssetFeeAsset?.networkName,
    sellAssetChain: sellAssetFeeAsset?.networkName,
    amountUsd: quoteSellAmountUsd,
    amountUserCurrency: sellAmountBeforeFeesUserCurrency,
    swapperName,
    shapeShiftFeeUserCurrency,
    shapeshiftFeeUsd,
    [compositeBuyAsset]: buyAmountBeforeFeesCryptoPrecision,
    [compositeSellAsset]: sellAmountBeforeFeesCryptoPrecision,
    isStreaming: activeQuote?.isStreaming ?? false,
    isLongtail: activeQuote?.isLongtail ?? false,
    tradeType,
    isQuickBuy,
  }
}

type ProtocolFeeDisplay = {
  assetId: AssetId | undefined
  chainName: string | undefined
  amountCryptoPrecision: string
  symbol: string
}

export const parseAmountDisplayMeta = (items: AmountDisplayMeta[]): ProtocolFeeDisplay[] => {
  const feeMap: Record<string, ProtocolFeeDisplay> = {}

  items
    .filter(({ amountCryptoBaseUnit }) => bnOrZero(amountCryptoBaseUnit).gt(0))
    .forEach(({ amountCryptoBaseUnit, asset }: AmountDisplayMeta) => {
      if (!asset.assetId) return
      const key = asset.assetId
      if (feeMap[key]) {
        // If we already have this asset+chain combination, add the amounts
        feeMap[key].amountCryptoPrecision = bnOrZero(feeMap[key].amountCryptoPrecision)
          .plus(fromBaseUnit(amountCryptoBaseUnit, asset.precision))
          .toString()
      } else {
        // First time seeing this asset+chain combination
        feeMap[key] = {
          assetId: asset.assetId,
          chainName: chainIdToChainDisplayName(asset.chainId),
          amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, asset.precision),
          symbol: asset.symbol,
        }
      }
    })

  return Object.values(feeMap)
}

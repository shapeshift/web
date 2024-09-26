import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import { getHopByIndex, type TradeQuote } from '@shapeshiftoss/swapper'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { selectUsdRateByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useInputOutputDifferenceDecimalPercentage = (tradeQuote: TradeQuote | undefined) => {
  const numSteps = tradeQuote?.steps.length ?? 0
  const sellAsset = tradeQuote?.steps[0].sellAsset
  const buyAsset = tradeQuote?.steps[numSteps - 1].buyAsset

  const sellAssetUsdRate = useAppSelector(state =>
    selectUsdRateByAssetId(state, sellAsset?.assetId ?? ''),
  )

  const buyAssetUsdRate = useAppSelector(state =>
    selectUsdRateByAssetId(state, buyAsset?.assetId ?? ''),
  )

  const sellAmountIncludingFeesUsd = useMemo(() => {
    if (!tradeQuote || !sellAsset || !sellAssetUsdRate) return

    // A quote always has a first hop
    const firstHop = getHopByIndex(tradeQuote, 0)!
    const sellAmountIncludingProtocolFeesCryptoBaseUnit =
      firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit

    const sellAmountIncludingProtocolFeesCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )

    return bn(sellAmountIncludingProtocolFeesCryptoPrecision).times(sellAssetUsdRate).toFixed()
  }, [sellAsset, sellAssetUsdRate, tradeQuote])

  const buyAmountAfterFeesUsd = useMemo(() => {
    if (!tradeQuote || !buyAsset || !buyAssetUsdRate) return

    const lastHopIndex = (numSteps - 1) as SupportedTradeQuoteStepIndex
    // A quote always has a last hop since it always has a first hop
    const lastHop = getHopByIndex(tradeQuote, lastHopIndex)!
    const buyAmountAfterProtocolFeesCryptoBaseUnit = lastHop.buyAmountAfterFeesCryptoBaseUnit

    const buyAmountAfterProtocolFeesCryptoPrecision = fromBaseUnit(
      buyAmountAfterProtocolFeesCryptoBaseUnit,
      buyAsset.precision,
    )

    return bn(buyAmountAfterProtocolFeesCryptoPrecision).times(buyAssetUsdRate).toFixed()
  }, [buyAsset, buyAssetUsdRate, numSteps, tradeQuote])

  if (buyAmountAfterFeesUsd === undefined || sellAmountIncludingFeesUsd === undefined)
    return undefined

  return bn(1).minus(bnOrZero(buyAmountAfterFeesUsd).div(sellAmountIncludingFeesUsd)).toString()
}

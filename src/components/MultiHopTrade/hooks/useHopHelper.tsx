import { useMemo } from 'react'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/common-selectors'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectSecondHopSellAccountId,
  selectSecondHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useHopHelper = () => {
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)

  // the network fee asset for the first hop in the trade
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)

  // the network fee asset for the second hop in the trade
  const secondHopSellFeeAsset = useAppSelector(selectSecondHopSellFeeAsset)

  // this is the account we're selling from - network fees are paid from the sell account for the current hop
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const secondHopSellAccountId = useAppSelector(selectSecondHopSellAccountId)

  const firstHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: firstHopSellFeeAsset?.assetId, accountId: firstHopSellAccountId ?? '' }),
    [firstHopSellAccountId, firstHopSellFeeAsset?.assetId],
  )

  const secondHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: secondHopSellFeeAsset?.assetId, accountId: secondHopSellAccountId ?? '' }),
    [secondHopSellAccountId, secondHopSellFeeAsset?.assetId],
  )

  const firstHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, firstHopFeeAssetBalanceFilter),
  )

  const secondHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, secondHopFeeAssetBalanceFilter),
  )

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: firstHopSellAccountId, assetId: firstHopSellAsset?.assetId ?? '' }),
    [firstHopSellAccountId, firstHopSellAsset?.assetId],
  )

  const sellAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )

  return {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    secondHopFeeAssetBalancePrecision,
  }
}

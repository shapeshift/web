import { useMemo } from 'react'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/common-selectors'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHopSellAccountId,
  selectLastHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useHopHelper = () => {
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)

  // the network fee asset for the first hop in the trade
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)

  // the network fee asset for the last hop in the trade
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)

  // this is the account we're selling from - network fees are paid from the sell account for the current hop
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const lastHopSellAccountId = useAppSelector(selectLastHopSellAccountId)

  const firstHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: firstHopSellFeeAsset?.assetId, accountId: firstHopSellAccountId ?? '' }),
    [firstHopSellAccountId, firstHopSellFeeAsset?.assetId],
  )

  const lastHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: lastHopSellFeeAsset?.assetId, accountId: lastHopSellAccountId ?? '' }),
    [lastHopSellAccountId, lastHopSellFeeAsset?.assetId],
  )

  const firstHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, firstHopFeeAssetBalanceFilter),
  )

  const lastHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, lastHopFeeAssetBalanceFilter),
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
    lastHopFeeAssetBalancePrecision,
  }
}

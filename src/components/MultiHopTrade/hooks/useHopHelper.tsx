import { useMemo } from 'react'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/common-selectors'
import { selectSellAccountId } from 'state/slices/selectors'
import {
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useHopHelper = () => {
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)

  // the network fee asset for the first hop in the trade
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)

  // the network fee asset for the last hop in the trade
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)

  // this is the account we're selling from - in this implementation, network fees are always paid
  // from the sell account regardless of how many hops we have (TODO: logic for osmo fees though)
  const sellAccountId = useAppSelector(selectSellAccountId)

  const firstHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: firstHopSellFeeAsset?.assetId, accountId: sellAccountId ?? '' }),
    [sellAccountId, firstHopSellFeeAsset?.assetId],
  )

  const lastHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: lastHopSellFeeAsset?.assetId, accountId: sellAccountId ?? '' }),
    [sellAccountId, lastHopSellFeeAsset?.assetId],
  )

  const firstHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, firstHopFeeAssetBalanceFilter),
  )

  const lastHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, lastHopFeeAssetBalanceFilter),
  )

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: sellAccountId, assetId: firstHopSellAsset?.assetId ?? '' }),
    [sellAccountId, firstHopSellAsset?.assetId],
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

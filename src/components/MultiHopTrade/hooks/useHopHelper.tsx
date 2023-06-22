import { useMemo } from 'react'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/common-selectors'
import {
  selectFirstHopBuyAsset,
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHopBuyAsset,
  selectLastHopSellAsset,
  selectLastHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useHopHelper = () => {
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const firstHopBuyAsset = useAppSelector(selectFirstHopBuyAsset)
  const lastHopSellAsset = useAppSelector(selectLastHopSellAsset)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const lastHopSellFeeAsset = useAppSelector(selectLastHopSellFeeAsset)

  const { sellAssetAccountId: firstHopSellAssetAccountId } = useAccountIds({
    buyAsset: firstHopBuyAsset,
    sellAsset: firstHopSellAsset,
  })

  const {
    sellAssetAccountId: lastHopSellAssetAccountId,
    buyAssetAccountId: lastHopBuyAssetAccountId,
  } = useAccountIds({
    buyAsset: lastHopBuyAsset,
    sellAsset: lastHopSellAsset,
  })

  const firstHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: firstHopSellFeeAsset?.assetId, accountId: firstHopSellAssetAccountId ?? '' }),
    [firstHopSellAssetAccountId, firstHopSellFeeAsset?.assetId],
  )

  const lastHopFeeAssetBalanceFilter = useMemo(
    () => ({ assetId: lastHopSellFeeAsset?.assetId, accountId: lastHopSellAssetAccountId ?? '' }),
    [lastHopSellAssetAccountId, lastHopSellFeeAsset?.assetId],
  )

  const firstHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, firstHopFeeAssetBalanceFilter),
  )

  const lastHopFeeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, lastHopFeeAssetBalanceFilter),
  )

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: firstHopSellAssetAccountId, assetId: firstHopSellAsset?.assetId ?? '' }),
    [firstHopSellAssetAccountId, firstHopSellAsset?.assetId],
  )

  const sellAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )

  return {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    lastHopFeeAssetBalancePrecision,
    lastHopBuyAssetAccountId,
  }
}

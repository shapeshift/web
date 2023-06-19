import { useMemo } from 'react'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { SwapperName } from 'lib/swapper/api'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/common-selectors'
import {
  selectFirstHop,
  selectFirstHopBuyAsset,
  selectFirstHopSellAsset,
  selectLastHop,
  selectLastHopBuyAsset,
  selectLastHopSellAsset,
  selectSellAmountCryptoPrecision,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useHopHelper = () => {
  const { selectedQuote } = useGetTradeQuotes()

  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const firstHopBuyAsset = useAppSelector(selectFirstHopBuyAsset)
  const lastHopSellAsset = useAppSelector(selectLastHopSellAsset)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

  const { sellAssetAccountId: firstHopSellAssetAccountId } = useAccountIds({
    buyAsset: firstHopBuyAsset,
    sellAsset: firstHopSellAsset,
  })

  const { sellAssetAccountId: lastHopSellAssetAccountId } = useAccountIds({
    buyAsset: lastHopBuyAsset,
    sellAsset: lastHopSellAsset,
  })

  const firstHopSellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, firstHopSellAsset?.assetId ?? ''),
  )

  const lastHopSellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, lastHopSellAsset?.assetId ?? ''),
  )

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

  // when trading from fee asset, the value of TX in fee asset is deducted
  const firstHopTradeDeductionCryptoPrecision =
    firstHopSellFeeAsset?.assetId === firstHopSellAsset?.assetId
      ? bnOrZero(sellAmountCryptoPrecision)
      : bn(0)

  const selectedSwapperName = useMemo(
    () => selectedQuote?.swapperName,
    [selectedQuote?.swapperName],
  )

  // TODO(woodenfurniture): update swappers to specify this as with protocol fees
  const networkFeeRequiresBalance = selectedSwapperName !== SwapperName.CowSwap

  const firstHopNetworkFeeCryptoPrecision = useMemo(
    () =>
      networkFeeRequiresBalance && firstHopSellFeeAsset
        ? fromBaseUnit(
            bnOrZero(firstHop?.feeData.networkFeeCryptoBaseUnit),
            firstHopSellFeeAsset.precision,
          )
        : bn(0),
    [firstHop?.feeData.networkFeeCryptoBaseUnit, networkFeeRequiresBalance, firstHopSellFeeAsset],
  )

  const lastHopNetworkFeeCryptoPrecision = useMemo(
    () =>
      networkFeeRequiresBalance && lastHopSellFeeAsset
        ? fromBaseUnit(
            bnOrZero(lastHop?.feeData.networkFeeCryptoBaseUnit),
            lastHopSellFeeAsset.precision,
          )
        : bn(0),
    [lastHop?.feeData.networkFeeCryptoBaseUnit, networkFeeRequiresBalance, lastHopSellFeeAsset],
  )

  return {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    firstHopNetworkFeeCryptoPrecision,
    firstHopTradeDeductionCryptoPrecision,
    lastHopFeeAssetBalancePrecision,
    lastHopNetworkFeeCryptoPrecision,
    firstHopSellFeeAsset,
    lastHopSellFeeAsset,
  }
}

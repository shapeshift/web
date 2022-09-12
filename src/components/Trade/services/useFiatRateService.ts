import { skipToken } from '@reduxjs/toolkit/query'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { type TradeState } from 'components/Trade/types'
import { type GetUsdRateArgs, useGetUsdRateQuery } from 'state/apis/swapper/swapperApi'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Fiat Rate Service is responsible for fetching and setting fiat rates.
It mutates the buyAssetFiatRate, sellAssetFiatRate, and feeAssetFiatRate properties of TradeState.
*/
export const useFiatRateService = () => {
  // Types
  type UsdRateQueryInput = Parameters<typeof useGetUsdRateQuery>
  type UsdRateInputArg = UsdRateQueryInput[0]

  // Form hooks
  const { control, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // State
  const [buyAssetFiatRateArgs, setBuyAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)
  const [sellAssetFiatRateArgs, setSellAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)
  const [feeAssetFiatRateArgs, setFeeAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId

  // Selectors
  const sellAssetFeeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  ).assetId

  // API
  const { data: buyAssetFiatRateData } = useGetUsdRateQuery(buyAssetFiatRateArgs, {
    pollingInterval: 30000,
    selectFromResult: ({ data }) => ({
      data: data?.usdRate,
    }),
  })
  const { data: sellAssetFiatRateData } = useGetUsdRateQuery(sellAssetFiatRateArgs, {
    pollingInterval: 30000,
    selectFromResult: ({ data }) => ({
      data: data?.usdRate,
    }),
  })
  const { data: feeAssetFiatRateData } = useGetUsdRateQuery(feeAssetFiatRateArgs, {
    pollingInterval: 30000,
    selectFromResult: ({ data }) => ({
      data: data?.usdRate,
    }),
  })

  // Trigger fiat rate queries
  useEffect(() => {
    if (sellTradeAssetId && buyTradeAssetId && sellAssetFeeAssetId) {
      const fiatArgsCommon: Pick<GetUsdRateArgs, 'buyAssetId' | 'sellAssetId'> = {
        buyAssetId: buyTradeAssetId!,
        sellAssetId: sellTradeAssetId!,
      }
      setBuyAssetFiatRateArgs({
        ...fiatArgsCommon,
        rateAssetId: buyTradeAssetId!,
      })
      setSellAssetFiatRateArgs({
        ...fiatArgsCommon,
        rateAssetId: sellTradeAssetId!,
      })
      setFeeAssetFiatRateArgs({
        ...fiatArgsCommon,
        rateAssetId: sellAssetFeeAssetId,
      })
    }
  }, [buyTradeAssetId, sellAssetFeeAssetId, sellTradeAssetId])

  // Set fiat rates
  useEffect(() => {
    buyAssetFiatRateData && setValue('buyAssetFiatRate', buyAssetFiatRateData)
    sellAssetFiatRateData && setValue('sellAssetFiatRate', sellAssetFiatRateData)
    feeAssetFiatRateData && setValue('feeAssetFiatRate', feeAssetFiatRateData)
  }, [buyAssetFiatRateData, feeAssetFiatRateData, sellAssetFiatRateData, setValue])
}

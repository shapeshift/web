import type { GetSwappersWithQuoteMetadataReturn } from '@shapeshiftoss/swapper'
import { useEffect, useState } from 'react'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { isSome } from 'lib/utils'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import { selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import { selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

// A helper hook to get the available swappers from the RTK API, mapping the SwapperTypes to swappers
export const useAvailableSwappers = () => {
  // Form hooks
  const { tradeQuoteArgs } = useTradeQuoteService()

  const updateAvailableSwappersWithMetadata = useSwapperStore(
    state => state.updateAvailableSwappersWithMetadata,
  )
  const updateActiveSwapperWithMetadata = useSwapperStore(
    state => state.updateActiveSwapperWithMetadata,
  )
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const updateFees = useSwapperStore(state => state.updateFees)

  // Constants
  const buyAssetId = buyAsset?.assetId
  const sellAssetId = sellAsset?.assetId
  const sellAssetChainId = sellAsset?.chainId

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))

  const [swappersWithQuoteMetadata, setSwappersWithQuoteMetadata] =
    useState<GetSwappersWithQuoteMetadataReturn>()
  const dispatch = useAppDispatch()

  const featureFlags = useAppSelector(selectFeatureFlags)
  const { getAvailableSwappers } = getSwappersApi.endpoints

  useEffect(() => {
    ;(async () => {
      const availableSwapperTypesWithQuoteMetadata =
        tradeQuoteArgs && feeAsset
          ? (
              await dispatch(
                getAvailableSwappers.initiate({
                  ...tradeQuoteArgs,
                  feeAsset,
                }),
              )
            ).data
          : undefined

      const swapperManager = await getSwapperManager(featureFlags)
      const swappers = swapperManager.swappers
      const availableSwappersWithQuoteMetadata = availableSwapperTypesWithQuoteMetadata
        ?.map(s => {
          const swapper = swappers.get(s.swapperType)
          return swapper
            ? {
                swapper,
                quote: s.quote,
                inputOutputRatio: s.inputOutputRatio,
              }
            : undefined
        })
        .filter(isSome)
      setSwappersWithQuoteMetadata(availableSwappersWithQuoteMetadata)
    })()
  }, [
    buyAssetId,
    dispatch,
    featureFlags,
    feeAsset,
    getAvailableSwappers,
    sellAssetId,
    tradeQuoteArgs,
  ])

  useEffect(() => {
    const activeSwapperWithQuoteMetadata = swappersWithQuoteMetadata?.[0]
    updateAvailableSwappersWithMetadata(swappersWithQuoteMetadata)
    updateActiveSwapperWithMetadata(activeSwapperWithQuoteMetadata)
    feeAsset && updateFees(feeAsset)
  }, [
    feeAsset,
    sellAsset?.assetId,
    swappersWithQuoteMetadata,
    updateActiveSwapperWithMetadata,
    updateAvailableSwappersWithMetadata,
    updateFees,
  ])
}

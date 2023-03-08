import type { GetSwappersWithQuoteMetadataReturn } from '@shapeshiftoss/swapper'
import { useEffect, useState } from 'react'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import type { SwapperContextType } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { isSome } from 'lib/utils'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import { selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

// A helper hook to get the available swappers from the RTK API, mapping the SwapperTypes to swappers
export const useAvailableSwappersService = (context: SwapperContextType) => {
  // Form hooks
  const {
    state: { sellTradeAsset, buyTradeAsset, tradeQuoteInputArgs },
    dispatch: swapperDispatch,
  } = context

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
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
        tradeQuoteInputArgs && feeAsset
          ? (
              await dispatch(
                getAvailableSwappers.initiate({
                  ...tradeQuoteInputArgs,
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
      // Handle a race condition between form state and useTradeQuoteService
      if (
        tradeQuoteInputArgs?.buyAsset.assetId === buyAssetId &&
        tradeQuoteInputArgs?.sellAsset.assetId === sellAssetId
      ) {
        setSwappersWithQuoteMetadata(availableSwappersWithQuoteMetadata)
      }
    })()
  }, [
    buyAssetId,
    dispatch,
    featureFlags,
    feeAsset,
    getAvailableSwappers,
    sellAssetId,
    swapperDispatch,
    tradeQuoteInputArgs,
  ])

  useEffect(() => {
    swappersWithQuoteMetadata &&
      swapperDispatch({
        type: SwapperActionType.SET_AVAILABLE_SWAPPERS,
        payload: swappersWithQuoteMetadata,
      })
  }, [swapperDispatch, swappersWithQuoteMetadata])
}

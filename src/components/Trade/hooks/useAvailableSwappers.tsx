import type { Asset } from '@shapeshiftoss/asset-service'
import type { GetSwappersWithQuoteMetadataReturn } from '@shapeshiftoss/swapper'
import { useEffect, useState } from 'react'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { isSome } from 'lib/utils'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

type AvailableSwapperArgs = { feeAsset: Asset | undefined }

// A helper hook to get the available swappers from the RTK API, mapping the SwapperTypes to swappers
export const useAvailableSwappers = ({ feeAsset }: AvailableSwapperArgs) => {
  // Form hooks
  const {
    state: { sellTradeAsset, buyTradeAsset },
  } = useSwapperState()
  const { tradeQuoteArgs } = useTradeQuoteService()

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const buyAssetId = buyAsset?.assetId
  const sellAssetId = sellAsset?.assetId

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
      // Handle a race condition between form state and useTradeQuoteService
      if (
        tradeQuoteArgs?.buyAsset.assetId === buyAssetId &&
        tradeQuoteArgs?.sellAsset.assetId === sellAssetId
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
    tradeQuoteArgs,
  ])

  const bestSwapperWithQuoteMetadata = swappersWithQuoteMetadata?.[0]

  return { bestSwapperWithQuoteMetadata, swappersWithQuoteMetadata }
}

import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Swapper } from '@shapeshiftoss/swapper'
import { useEffect, useState } from 'react'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { getBestSwapperApi } from 'state/apis/swapper/getBestSwapperApi'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

// A helper hook to get the best swapper from the RTK API
export const useBestSwapper = ({ feeAsset }: { feeAsset: Asset | undefined }) => {
  const [bestSwapper, setBestSwapper] = useState<Swapper<ChainId>>()
  const dispatch = useAppDispatch()
  const { tradeQuoteArgs } = useTradeQuoteService()

  const featureFlags = useAppSelector(selectFeatureFlags)
  const { getBestSwapperType } = getBestSwapperApi.endpoints

  useEffect(() => {
    ;(async () => {
      const bestSwapperType =
        tradeQuoteArgs && feeAsset
          ? (
              await dispatch(
                getBestSwapperType.initiate({
                  ...tradeQuoteArgs,
                  feeAsset,
                }),
              )
            ).data
          : undefined

      const swapperManager = await getSwapperManager(featureFlags)
      const swappers = swapperManager.swappers
      setBestSwapper(bestSwapperType ? swappers.get(bestSwapperType) : undefined)
    })()
  }, [dispatch, featureFlags, feeAsset, getBestSwapperType, tradeQuoteArgs])

  return { bestSwapper }
}

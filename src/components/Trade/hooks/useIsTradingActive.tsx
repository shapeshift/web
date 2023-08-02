import { useEffect, useState } from 'react'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { selectBuyAsset, selectSellAsset } from 'state/slices/swappersSlice/selectors'
import { selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const dispatch = useAppDispatch()

  const sellAssetId = useAppSelector(selectSellAsset).assetId
  const buyAssetId = useAppSelector(selectBuyAsset).assetId
  const activeSwapper = useAppSelector(selectActiveSwapperName)

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints

  useEffect(() => {
    ;(async () => {
      const isTradingActiveOnSellPoolResult =
        sellAssetId &&
        activeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: sellAssetId,
              swapperName: activeSwapper,
            }),
          )
        ).data

      const isTradingActiveOnBuyPoolResult =
        buyAssetId &&
        activeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: buyAssetId,
              swapperName: activeSwapper,
            }),
          )
        ).data

      setIsTradingActiveOnSellPool(!!isTradingActiveOnSellPoolResult)
      setIsTradingActiveOnBuyPool(!!isTradingActiveOnBuyPoolResult)
    })()
  }, [activeSwapper, buyAssetId, dispatch, getIsTradingActive, sellAssetId])

  return {
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    isTradingActive: isTradingActiveOnSellPool && isTradingActiveOnBuyPool,
  }
}

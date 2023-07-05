import { useEffect, useState } from 'react'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import { selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const dispatch = useAppDispatch()

  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellAssetId = sellAsset?.assetId
  const buyAssetId = buyAsset?.assetId

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints
  const swapperName = useAppSelector(selectActiveSwapperName)

  useEffect(() => {
    ;(async () => {
      const isTradingActiveOnSellPoolResult =
        sellAssetId &&
        swapperName &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: sellAssetId,
              swapperName,
            }),
          )
        ).data

      const isTradingActiveOnBuyPoolResult =
        buyAssetId &&
        swapperName &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: buyAssetId,
              swapperName,
            }),
          )
        ).data

      setIsTradingActiveOnSellPool(!!isTradingActiveOnSellPoolResult)
      setIsTradingActiveOnBuyPool(!!isTradingActiveOnBuyPoolResult)
    })()
  }, [swapperName, buyAssetId, dispatch, getIsTradingActive, sellAssetId])

  return {
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    isTradingActive: isTradingActiveOnSellPool && isTradingActiveOnBuyPool,
  }
}

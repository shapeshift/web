import { useEffect, useState } from 'react'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { selectBuyAsset, selectSellAsset } from 'state/slices/swappersSlice/selectors'
import { selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const dispatch = useAppDispatch()

  const buyAssetId = useAppSelector(selectBuyAsset).assetId
  const sellAssetId = useAppSelector(selectSellAsset).assetId

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

      setIsTradingActiveOnSellPool(!!isTradingActiveOnSellPoolResult)
    })()
  }, [dispatch, getIsTradingActive, sellAssetId, swapperName])

  useEffect(() => {
    ;(async () => {
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

      setIsTradingActiveOnBuyPool(!!isTradingActiveOnBuyPoolResult)
    })()
  }, [buyAssetId, dispatch, getIsTradingActive, swapperName])

  return {
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    isTradingActive: isTradingActiveOnSellPool && isTradingActiveOnBuyPool,
  }
}

import { useEffect, useState } from 'react'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { useAppDispatch } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const dispatch = useAppDispatch()

  const buyAsset = useSwapperStore(state => state.buyAsset)
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const sellAssetId = sellAsset?.assetId
  const buyAssetId = buyAsset?.assetId

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints
  const bestTradeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)

  useEffect(() => {
    ;(async () => {
      const isTradingActiveOnSellPoolResult =
        sellAssetId &&
        bestTradeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: sellAssetId,
              swapperName: bestTradeSwapper.name,
            }),
          )
        ).data

      const isTradingActiveOnBuyPoolResult =
        buyAssetId &&
        bestTradeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: buyAssetId,
              swapperName: bestTradeSwapper.name,
            }),
          )
        ).data

      setIsTradingActiveOnSellPool(!!isTradingActiveOnSellPoolResult)
      setIsTradingActiveOnBuyPool(!!isTradingActiveOnBuyPoolResult)
    })()
  }, [bestTradeSwapper, buyAssetId, dispatch, getIsTradingActive, sellAssetId])

  return { isTradingActiveOnSellPool, isTradingActiveOnBuyPool }
}

import { useEffect, useState } from 'react'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { useAppDispatch } from 'state/store'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const dispatch = useAppDispatch()

  const {
    state: { sellTradeAsset, buyTradeAsset, activeSwapperWithMetadata },
  } = useSwapperState()

  const activeSwapper = activeSwapperWithMetadata?.swapper
  const sellTradeAssetId = sellTradeAsset?.asset?.assetId
  const buyTradeAssetId = buyTradeAsset?.asset?.assetId

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints

  useEffect(() => {
    ;(async () => {
      const isTradingActiveOnSellPoolResult =
        sellTradeAssetId &&
        activeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: sellTradeAssetId,
              swapperName: activeSwapper.name,
            }),
          )
        ).data

      const isTradingActiveOnBuyPoolResult =
        buyTradeAssetId &&
        activeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: buyTradeAssetId,
              swapperName: activeSwapper.name,
            }),
          )
        ).data

      setIsTradingActiveOnSellPool(!!isTradingActiveOnSellPoolResult)
      setIsTradingActiveOnBuyPool(!!isTradingActiveOnBuyPoolResult)
    })()
  }, [activeSwapper, buyTradeAssetId, dispatch, getIsTradingActive, sellTradeAssetId])

  return { isTradingActiveOnSellPool, isTradingActiveOnBuyPool }
}

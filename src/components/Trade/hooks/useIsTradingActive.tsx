import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import type { TS } from 'components/Trade/types'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { useAppDispatch } from 'state/store'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const { bestTradeSwapper } = useSwapper()
  const dispatch = useAppDispatch()

  const { control } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const sellTradeAssetId = sellTradeAsset?.asset?.assetId
  const buyTradeAssetId = buyTradeAsset?.asset?.assetId

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints

  useEffect(() => {
    ;(async () => {
      const isTradingActiveOnSellPoolResult =
        sellTradeAssetId &&
        bestTradeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: sellTradeAssetId,
              swapperName: bestTradeSwapper.name,
            }),
          )
        ).data

      const isTradingActiveOnBuyPoolResult =
        buyTradeAssetId &&
        bestTradeSwapper &&
        (
          await dispatch(
            getIsTradingActive.initiate({
              assetId: buyTradeAssetId,
              swapperName: bestTradeSwapper.name,
            }),
          )
        ).data

      setIsTradingActiveOnSellPool(!!isTradingActiveOnSellPoolResult)
      setIsTradingActiveOnBuyPool(!!isTradingActiveOnBuyPoolResult)
    })()
  }, [bestTradeSwapper, buyTradeAssetId, dispatch, getIsTradingActive, sellTradeAssetId])

  return { isTradingActiveOnSellPool, isTradingActiveOnBuyPool }
}

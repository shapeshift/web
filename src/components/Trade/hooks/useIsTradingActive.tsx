import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import type { TS } from 'components/Trade/types'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import { useAppDispatch } from 'state/store'

export const useIsTradingActive = () => {
  const [isTradingActiveOnSellChain, setIsTradingActiveOnSellChain] = useState(false)

  const { bestTradeSwapper } = useSwapper()
  const dispatch = useAppDispatch()

  const { control } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const sellTradeAssetId = sellTradeAsset?.asset?.assetId

  const { getIsTradingActive } = getIsTradingActiveApi.endpoints

  useEffect(() => {
    ;(async () => {
      const isTradingActiveResult =
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

      setIsTradingActiveOnSellChain(!!isTradingActiveResult)
    })()
  }, [bestTradeSwapper, dispatch, getIsTradingActive, sellTradeAssetId])

  return { isTradingActiveOnSellChain }
}

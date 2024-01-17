import { useEffect, useState } from 'react'
import type { ThorEvmTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { TradeType } from 'lib/swapper/swappers/ThorchainSwapper/utils/longTailHelpers'
import { swappersApi } from 'state/apis/swappers/swappersApi'
import { selectBuyAsset, selectSellAsset } from 'state/slices/swappersSlice/selectors'
import { selectActiveQuote, selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useIsTradingActive = () => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const tradeType = (activeQuote as ThorEvmTradeQuote)?.tradeType

  const [isTradingActiveOnSellPool, setIsTradingActiveOnSellPool] = useState(false)
  const [isTradingActiveOnBuyPool, setIsTradingActiveOnBuyPool] = useState(false)

  const dispatch = useAppDispatch()

  const buyAssetId = useAppSelector(selectBuyAsset).assetId
  const sellAssetId = useAppSelector(selectSellAsset).assetId

  const { getIsTradingActive } = swappersApi.endpoints
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
    isTradingActiveOnSellPool:
      tradeType === TradeType.L1ToL1 || tradeType === TradeType.L1ToLongTail
        ? isTradingActiveOnSellPool
        : true,
    isTradingActiveOnBuyPool:
      tradeType === TradeType.L1ToL1 || tradeType === TradeType.LongTailToL1
        ? isTradingActiveOnBuyPool
        : true,
    isTradingActive: isTradingActiveOnSellPool && isTradingActiveOnBuyPool,
  }
}

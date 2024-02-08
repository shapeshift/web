import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'
import type { ThorEvmTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { TradeType } from 'lib/swapper/swappers/ThorchainSwapper/utils/longTailHelpers'
import { selectInputBuyAsset, selectInputSellAsset } from 'state/slices/tradeInputSlice/selectors'
import { selectActiveQuote, selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useIsTradingActive = () => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const tradeType = (activeQuote as ThorEvmTradeQuote)?.tradeType

  const buyAssetId = useAppSelector(selectInputBuyAsset).assetId
  const sellAssetId = useAppSelector(selectInputSellAsset).assetId

  const swapperName = useAppSelector(selectActiveSwapperName)

  const { data: isTradingActiveOnSellPool } = useQuery({
    ...reactQueries.common.isTradingActive({
      assetId: sellAssetId,
      swapperName,
    }),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Go stale instantly
    staleTime: 0,
    // Never store queries in cache since we always want fresh data
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000,
  })

  const { data: isTradingActiveOnBuyPool } = useQuery({
    ...reactQueries.common.isTradingActive({
      assetId: buyAssetId,
      swapperName,
    }),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Go stale instantly
    // Never store queries in cache since we always want fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000,
  })

  return {
    isTradingActiveOnSellPool:
      tradeType === TradeType.L1ToL1 || tradeType === TradeType.L1ToLongTail
        ? Boolean(isTradingActiveOnSellPool)
        : true,
    isTradingActiveOnBuyPool:
      tradeType === TradeType.L1ToL1 || tradeType === TradeType.LongTailToL1
        ? Boolean(isTradingActiveOnBuyPool)
        : true,
    isTradingActive: Boolean(isTradingActiveOnSellPool && isTradingActiveOnBuyPool),
  }
}

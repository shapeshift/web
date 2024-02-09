import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { selectInboundAddressData, selectIsTradingActive } from 'react-queries/selectors'
import type { ThorEvmTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { TradeType } from 'lib/swapper/swappers/ThorchainSwapper/utils/longTailHelpers'
import { thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'
import { selectInputBuyAsset, selectInputSellAsset } from 'state/slices/tradeInputSlice/selectors'
import { selectActiveQuote, selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useIsTradingActive = () => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const tradeType = (activeQuote as ThorEvmTradeQuote)?.tradeType

  const buyAssetId = useAppSelector(selectInputBuyAsset).assetId
  const sellAssetId = useAppSelector(selectInputSellAsset).assetId

  const swapperName = useAppSelector(selectActiveSwapperName)

  const { data: sellAssetInboundAddressData, isLoading: isSellAssetInboundAddressLoading } =
    useQuery({
      ...reactQueries.thornode.inboundAddresses(),
      // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
      // Go stale instantly
      staleTime: 0,
      // Never store queries in cache since we always want fresh data
      gcTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: 60_000,
      select: data => selectInboundAddressData(data, sellAssetId),
      enabled: Boolean(sellAssetId),
    })

  const { data: buyAssetInboundAddressData, isLoading: isBuyAssetInboundAddressLoading } = useQuery(
    {
      ...reactQueries.thornode.inboundAddresses(),
      // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
      // Go stale instantly
      staleTime: 0,
      // Never store queries in cache since we always want fresh data
      gcTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: 60_000,
      select: data => selectInboundAddressData(data, buyAssetId),
      enabled: Boolean(buyAssetId),
    },
  )

  const { data: mimir, isLoading: isMimirLoading } = useQuery({
    ...reactQueries.thornode.mimir(),
    staleTime: thorchainBlockTimeMs,
    enabled: !!swapperName,
  })

  const isTradingActiveOnSellPool = useMemo(() => {
    if (isSellAssetInboundAddressLoading || isMimirLoading || !mimir || !swapperName) return

    return selectIsTradingActive({
      assetId: sellAssetId,
      inboundAddressResponse: sellAssetInboundAddressData,
      swapperName,
      mimir,
    })
  }, [
    isSellAssetInboundAddressLoading,
    isMimirLoading,
    sellAssetId,
    sellAssetInboundAddressData,
    swapperName,
    mimir,
  ])

  const isTradingActiveOnBuyPool = useMemo(() => {
    if (isBuyAssetInboundAddressLoading || isMimirLoading || !mimir || !swapperName) return

    return selectIsTradingActive({
      assetId: buyAssetId,
      inboundAddressResponse: buyAssetInboundAddressData,
      swapperName,
      mimir,
    })
  }, [
    isBuyAssetInboundAddressLoading,
    isMimirLoading,
    buyAssetId,
    buyAssetInboundAddressData,
    swapperName,
    mimir,
  ])

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

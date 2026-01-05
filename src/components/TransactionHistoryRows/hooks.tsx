import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Dex, TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import type { TradeFees } from './utils'
import { getTradeFees } from './utils'

import type { TxDetails } from '@/hooks/useTxDetails/useTxDetails'
import { usePriceHistoryQuery } from '@/lib/graphql/queries'
import { selectCryptoPriceHistoryTimeframe } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useTradeFees = ({ txDetails }: { txDetails: TxDetails }) => {
  const cryptoPriceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, HistoryTimeframe.ALL),
  )

  const buy = useMemo(
    () => txDetails.transfers.find(transfer => transfer.type === TransferType.Receive),
    [txDetails.transfers],
  )

  const sell = useMemo(
    () => txDetails.transfers.find(transfer => transfer.type === TransferType.Send),
    [txDetails.transfers],
  )

  const isCowSwapTrade = useMemo(() => {
    return txDetails.tx.trade?.dexName === Dex.CowSwap
  }, [txDetails.tx.trade?.dexName])

  const shouldFetchBuyPriceHistory = useMemo(() => {
    return isCowSwapTrade && buy && !cryptoPriceHistoryData?.[buy.asset.assetId]
  }, [isCowSwapTrade, buy, cryptoPriceHistoryData])

  const shouldFetchSellPriceHistory = useMemo(() => {
    return isCowSwapTrade && sell && !cryptoPriceHistoryData?.[sell.asset.assetId]
  }, [isCowSwapTrade, sell, cryptoPriceHistoryData])

  const { isLoading: isBuyAssetPriceHistoryLoading } = usePriceHistoryQuery({
    assetId: buy?.asset.assetId,
    timeframe: HistoryTimeframe.ALL,
    enabled: shouldFetchBuyPriceHistory,
  })

  const { isLoading: isSellAssetPriceHistoryLoading } = usePriceHistoryQuery({
    assetId: sell?.asset.assetId,
    timeframe: HistoryTimeframe.ALL,
    enabled: shouldFetchSellPriceHistory,
  })

  const tradeFees: TradeFees | undefined = useMemo(() => {
    if (!(txDetails.tx.trade && buy && sell)) return
    if (!isCowSwapTrade) return
    if (isBuyAssetPriceHistoryLoading || isSellAssetPriceHistoryLoading) return

    const tradeFees = getTradeFees({
      sell,
      buy,
      blockTime: dayjs(txDetails.tx.blockTime * 1000).valueOf(),
      cryptoPriceHistoryData,
    })

    return tradeFees
  }, [
    txDetails.tx.trade,
    txDetails.tx.blockTime,
    buy,
    sell,
    isCowSwapTrade,
    cryptoPriceHistoryData,
    isBuyAssetPriceHistoryLoading,
    isSellAssetPriceHistoryLoading,
  ])

  return tradeFees
}

import { skipToken } from '@reduxjs/toolkit/dist/query'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Dex, TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { useFindPriceHistoryByAssetIdQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import type { FindPriceHistoryByAssetIdArgs } from 'state/slices/marketDataSlice/types'
import { selectCryptoPriceHistoryTimeframe } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { TradeFees } from './utils'
import { getTradeFees } from './utils'

export const useTradeFees = ({ txDetails }: { txDetails: TxDetails }) => {
  const cryptoPriceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, HistoryTimeframe.ALL),
  )

  const [sellAssetPriceHistoryParams, setSellAssetPriceHistoryParams] = useState<
    FindPriceHistoryByAssetIdArgs | typeof skipToken
  >(skipToken)

  const [buyAssetPriceHistoryParams, setBuyAssetPriceHistoryParams] = useState<
    FindPriceHistoryByAssetIdArgs | typeof skipToken
  >(skipToken)

  const { isLoading: isSellAssetPriceHistoryLoading } = useFindPriceHistoryByAssetIdQuery(
    sellAssetPriceHistoryParams,
  )
  const { isLoading: isBuyAssetPriceHistoryLoading } = useFindPriceHistoryByAssetIdQuery(
    buyAssetPriceHistoryParams,
  )

  const buy = useMemo(
    () => txDetails.transfers.find(transfer => transfer.type === TransferType.Receive),
    [txDetails.transfers],
  )

  const sell = useMemo(
    () => txDetails.transfers.find(transfer => transfer.type === TransferType.Send),
    [txDetails.transfers],
  )

  const tradeFees: TradeFees | undefined = useMemo(() => {
    if (!(txDetails.tx.trade && buy && sell)) return
    if (txDetails.tx.trade.dexName !== Dex.CowSwap) return

    if (!cryptoPriceHistoryData?.[buy.asset.assetId] && !isBuyAssetPriceHistoryLoading)
      setBuyAssetPriceHistoryParams({
        assetId: buy.asset.assetId,
        timeframe: HistoryTimeframe.ALL,
      })
    if (!cryptoPriceHistoryData?.[sell.asset.assetId] && !isSellAssetPriceHistoryLoading)
      setSellAssetPriceHistoryParams({
        assetId: sell.asset.assetId,
        timeframe: HistoryTimeframe.ALL,
      })

    const tradeFees = getTradeFees({
      sell,
      buy,
      blockTime: dayjs(txDetails.tx.blockTime * 1000).valueOf(), // unchained uses seconds
      cryptoPriceHistoryData,
    })

    return tradeFees
  }, [
    txDetails.tx.trade,
    txDetails.tx.blockTime,
    buy,
    sell,
    cryptoPriceHistoryData,
    isBuyAssetPriceHistoryLoading,
    isSellAssetPriceHistoryLoading,
  ])

  return tradeFees
}

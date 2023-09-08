import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Dex, TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectCryptoPriceHistoryTimeframe } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { TradeFees } from './utils'
import { getTradeFees } from './utils'

export const useTradeFees = ({ txDetails }: { txDetails: TxDetails }) => {
  const dispatch = useDispatch()
  const [tradeFees, setTradeFees] = useState<TradeFees | undefined>(undefined)
  const cryptoPriceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, HistoryTimeframe.ALL),
  )

  const { findPriceHistoryByAssetId } = marketApi.endpoints

  const buy = useMemo(
    () => txDetails.transfers.find(transfer => transfer.type === TransferType.Receive),
    [txDetails.transfers],
  )

  const sell = useMemo(
    () => txDetails.transfers.find(transfer => transfer.type === TransferType.Send),
    [txDetails.transfers],
  )

  useEffect(() => {
    if (!(txDetails.tx.trade && buy && sell)) return
    if (txDetails.tx.trade.dexName !== Dex.CowSwap) return

    if (!cryptoPriceHistoryData?.[buy.asset.assetId]) {
      dispatch(
        findPriceHistoryByAssetId.initiate({
          assetId: buy.asset.assetId,
          timeframe: HistoryTimeframe.ALL,
        }),
      )
    }

    if (!cryptoPriceHistoryData?.[sell.asset.assetId]) {
      dispatch(
        findPriceHistoryByAssetId.initiate({
          assetId: sell.asset.assetId,
          timeframe: HistoryTimeframe.ALL,
        }),
      )
    }

    const tradeFees = getTradeFees({
      sell,
      buy,
      blockTime: dayjs(txDetails.tx.blockTime * 1000).valueOf(), // unchained uses seconds
      cryptoPriceHistoryData,
    })

    setTradeFees(tradeFees)
  }, [dispatch, buy, sell, cryptoPriceHistoryData, findPriceHistoryByAssetId, txDetails.tx])

  return { tradeFees }
}

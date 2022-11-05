import { HistoryTimeframe } from '@keepkey/types'
import { Dex } from '@keepkey/unchained-client'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetById, selectCryptoPriceHistoryTimeframe } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { getTradeFees } from './utils'

export const useTradeFees = ({ txDetails }: { txDetails: TxDetails }) => {
  const [tradeFees, setTradeFees] = useState<string | null>(null)

  const dispatch = useDispatch()
  const cryptoPriceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, HistoryTimeframe.ALL),
  )

  const buyAsset = useAppSelector(state =>
    selectAssetById(state, txDetails.buyAsset?.assetId ?? ''),
  )
  const sellAsset = useAppSelector(state =>
    selectAssetById(state, txDetails.sellAsset?.assetId ?? ''),
  )

  const { findPriceHistoryByAssetId } = marketApi.endpoints

  useEffect(() => {
    if (
      !(
        txDetails?.tx?.trade &&
        txDetails.sellAsset &&
        txDetails.buyAsset &&
        txDetails.sellTransfer &&
        txDetails.buyTransfer
      )
    )
      return
    if (txDetails.tx.trade.dexName !== Dex.CowSwap) return

    if (
      !(
        cryptoPriceHistoryData[txDetails.buyAsset.assetId] &&
        cryptoPriceHistoryData[txDetails.sellAsset.assetId]
      )
    ) {
      const [sellAssetId, buyAssetId] = [txDetails.sellAsset.assetId, txDetails.buyAsset.assetId]

      // Fetch / use cached price history by assetId
      ;[sellAssetId, buyAssetId].forEach(assetId => {
        dispatch(findPriceHistoryByAssetId.initiate({ assetId, timeframe: HistoryTimeframe.ALL }))
      })
    }

    const tradeFees = getTradeFees({
      sellAsset,
      buyAsset,
      blockTime: dayjs(txDetails.tx.blockTime * 1000).valueOf(), // unchained uses seconds
      sellAmount: txDetails.sellTransfer.value,
      buyAmount: txDetails.buyTransfer.value,
      cryptoPriceHistoryData,
    })

    setTradeFees(tradeFees)
  }, [
    dispatch,
    buyAsset,
    sellAsset,
    cryptoPriceHistoryData,
    findPriceHistoryByAssetId,
    txDetails.buyAsset,
    txDetails,
    txDetails.sellTransfer,
  ])

  return { tradeFees }
}

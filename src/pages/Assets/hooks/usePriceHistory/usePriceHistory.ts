import { getPriceHistory } from '@shapeshiftoss/market-service'
import { Asset, HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'

type UsePriceHistory = {
  asset?: Asset
  timeframe: HistoryTimeframe
}

export const usePriceHistory = ({ asset, timeframe }: UsePriceHistory) => {
  const [data, setData] = useState<HistoryData[] | null>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setLoading(true)
    if (asset?.name) {
      ;(async () => {
        try {
          setLoading(true)
          const data = await getPriceHistory({
            chain: asset.chain,
            timeframe,
            tokenId: asset.tokenId
          })
          if (!data) return
          setData(data)
          setLoading(false)
        } catch (error) {
          // do nothing...
        }
      })()
    }
  }, [asset, timeframe])

  return { data, loading }
}

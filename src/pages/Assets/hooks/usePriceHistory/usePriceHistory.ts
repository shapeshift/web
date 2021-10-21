import { getPriceHistory } from '@shapeshiftoss/market-service'
import { marketService } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

type UsePriceHistory = {
  asset?: AssetMarketData
  timeframe: marketService.HistoryTimeframe
}

export const usePriceHistory = ({ asset, timeframe }: UsePriceHistory) => {
  const [data, setData] = useState<marketService.HistoryData[] | null>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setLoading(true)
    if (asset?.name) {
      ;(async () => {
        setLoading(true)
        const data = await getPriceHistory({
          chain: asset.chain,
          timeframe,
          tokenId: asset.tokenId
        })
        if (!data) return
        setData(data)
        setLoading(false)
      })()
    }
  }, [asset, timeframe])

  return { data, loading }
}

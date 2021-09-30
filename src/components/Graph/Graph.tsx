import { Center, Fade, SlideFade } from '@chakra-ui/react'
import { getPriceHistory } from '@shapeshiftoss/market-service'
import { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import { ParentSize } from '@visx/responsive'
import BigNumber from 'bignumber.js'
import { useEffect, useState } from 'react'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

import { GraphLoading } from './GraphLoading'
import { PrimaryChart } from './PrimaryChart/PrimaryChart'
type GraphProps = {
  asset?: AssetMarketData
  timeframe: HistoryTimeframe
  setPercentChange?: (percentChange: number) => void
  isLoaded?: boolean
}

export const Graph = ({ asset, timeframe, setPercentChange, isLoaded }: GraphProps) => {
  const [data, setData] = useState<HistoryData[] | null>([])
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
        const startValue = data[0]?.price
        const endValue = data[data.length - 1]?.price
        if (setPercentChange && startValue && endValue) {
          const change = new BigNumber(endValue)
            .minus(startValue)
            .div(new BigNumber(startValue).abs())
            .times(100)
            .toNumber()
          setPercentChange(change)
        }
      })()
    }
  }, [asset, timeframe, setPercentChange])

  return (
    <ParentSize debounceTime={10}>
      {parent =>
        loading || !isLoaded ? (
          <Fade in={loading || !isLoaded}>
            <Center width='full' height={parent.height}>
              <GraphLoading />
            </Center>
          </Fade>
        ) : data?.length ? (
          <SlideFade in={!loading}>
            <PrimaryChart
              data={data ?? []}
              height={parent.height}
              width={parent.width}
              margin={{
                top: 16,
                right: 0,
                bottom: 46,
                left: 0
              }}
            />
          </SlideFade>
        ) : null
      }
    </ParentSize>
  )
}

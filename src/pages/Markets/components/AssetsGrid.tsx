import { GridItem, useMediaQuery } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useLocation, useNavigate } from 'react-router-dom'

import { AssetCard } from './AssetCard'
import { CardWithSparkline } from './CardWithSparkline'
import { LoadingGrid } from './LoadingGrid'
import { MarketGrid } from './MarketGrid'

import { ResultsEmpty } from '@/components/ResultsEmpty'
import { vibrate } from '@/lib/vibrate'
import { breakpoints } from '@/theme/theme'

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

export const AssetsGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
  limit: number | undefined
  showSparkline?: boolean
  showMarketCap?: boolean
}> = ({ assetIds, selectedChainId, limit, isLoading, showSparkline, showMarketCap }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, limit !== undefined && showSparkline ? limit - 1 : limit),
    [assetIds, limit, selectedChainId, showSparkline],
  )

  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      vibrate('heavy')
      return navigate(`/assets/${assetId}`)
    },
    [navigate],
  )

  if (isLoading) return <LoadingGrid showSparkline={showSparkline} />

  if (!filteredAssetIds.length)
    return (
      <ResultsEmpty
        title={
          location.pathname === '/markets/watchlist'
            ? 'markets.watchlistEmpty.emptyTitle'
            : 'markets.emptyTitle'
        }
        body={
          location.pathname === '/markets/watchlist'
            ? 'markets.watchlistEmpty.emptyBody'
            : 'markets.emptyBody'
        }
        icon={emptyIcon}
      />
    )

  return (
    <MarketGrid>
      {filteredAssetIds.map((assetId, index) => {
        if (showSparkline && isLargerThanMd) {
          return index === 0 ? (
            <GridItem key={assetId} rowSpan={2} colSpan={2}>
              <CardWithSparkline assetId={assetId} onClick={handleCardClick} />
            </GridItem>
          ) : (
            <GridItem key={assetId}>
              <AssetCard assetId={assetId} onClick={handleCardClick} />
            </GridItem>
          )
        }

        return (
          <GridItem key={assetId}>
            <AssetCard assetId={assetId} onClick={handleCardClick} showMarketCap={showMarketCap} />
          </GridItem>
        )
      })}
    </MarketGrid>
  )
}

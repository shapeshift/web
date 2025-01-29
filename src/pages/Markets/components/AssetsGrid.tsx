import { GridItem, useMediaQuery } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useHistory } from 'react-router'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { breakpoints } from 'theme/theme'

import { AssetCard } from './AssetCard'
import { CardWithSparkline } from './CardWithSparkline'
import { LoadingGrid } from './LoadingGrid'
import { MarketGrid } from './MarketGrid'

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

export const AssetsGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
  limit: number | undefined
  showSparkline?: boolean
  showMarketCap?: boolean
}> = ({ assetIds, selectedChainId, limit, isLoading, showSparkline, showMarketCap }) => {
  const history = useHistory()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, limit && showSparkline ? limit - 1 : limit),
    [assetIds, limit, selectedChainId, showSparkline],
  )

  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )

  if (isLoading) return <LoadingGrid showSparkline={showSparkline} />

  if (!filteredAssetIds.length)
    return (
      <ResultsEmpty
        title={
          history.location.pathname === '/markets/watchlist'
            ? 'markets.watchlistEmpty.emptyTitle'
            : 'markets.emptyTitle'
        }
        body={
          history.location.pathname === '/markets/watchlist'
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

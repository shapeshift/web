import { Grid, GridItem, Skeleton } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import noop from 'lodash/noop'
import { useCallback, useMemo } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useHistory } from 'react-router'
import { ResultsEmpty } from 'components/ResultsEmpty'

import { AssetCard } from './AssetCard'
import { CardWithSparkline } from './CardWithSparkline'

const gridTemplateColumnSx = { base: 'minmax(0, 1fr)', md: 'repeat(9, 1fr)' }
const gridTemplateRowsSx = { base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)' }

const colSpanSparklineSx = { base: 1, md: 3 }
const colSpanSx = { base: 1, md: 2 }

const rowSpanSparklineSx = { base: 1, md: 2 }

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

export const AssetsGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
  limit: number | undefined
}> = ({ assetIds, selectedChainId, limit, isLoading }) => {
  const history = useHistory()
  console.log({ location: history.location })
  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, limit && limit - 1),
    [assetIds, limit, selectedChainId],
  )

  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )

  if (isLoading)
    return (
      <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
        {new Array(8).fill(null).map((_, index) => (
          <GridItem colSpan={index === 0 ? colSpanSparklineSx : colSpanSx}>
            <Skeleton isLoaded={false}>
              <AssetCard onClick={noop} assetId={ethAssetId} />
            </Skeleton>
          </GridItem>
        ))}
      </Grid>
    )

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
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) =>
        index === 0 ? (
          <GridItem rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
            <CardWithSparkline key={assetId} assetId={assetId} onClick={handleCardClick} />
          </GridItem>
        ) : (
          <GridItem colSpan={colSpanSx}>
            <AssetCard key={assetId} assetId={assetId} onClick={handleCardClick} />
          </GridItem>
        ),
      )}
    </Grid>
  )
}

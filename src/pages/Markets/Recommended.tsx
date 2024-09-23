import { Box, Flex, Grid, GridItem, Heading, Skeleton, Text } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { thorchainSaversOpportunityIdsResolver } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { selectAssetIds, selectFeatureFlag } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AssetCard } from './components/AssetCard'
import { CardWithSparkline } from './components/CardWithSparkline'
import { LpGridItem } from './components/LpCard'
import {
  useRecentlyAddedQuery,
  useTopMoversQuery,
  useTrendingQuery,
} from './hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from './hooks/usePortalsAssetsQuery'
import { MarketsHeader } from './MarketsHeader'

type RowProps = {
  title: string
  subtitle?: string
  supportedChainIds: ChainId[] | undefined
  displayChainDropdown: boolean
  children: (selectedChainId: ChainId | undefined) => React.ReactNode
}

const containerPaddingX = { base: 4, xl: 0 }

const gridTemplateColumnSx = { base: 'minmax(0, 1fr)', md: 'repeat(9, 1fr)' }
const gridTemplateRowsSx = { base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)' }

const colSpanSparklineSx = { base: 1, md: 3 }
const colSpanSx = { base: 1, md: 2 }

const rowSpanSparklineSx = { base: 1, md: 2 }

const AssetsGrid: React.FC<{
  assetIds: AssetId[]
  isLoading: boolean
}> = ({ assetIds, isLoading }) => {
  const history = useHistory()
  const filteredAssetIds = useMemo(() => assetIds.slice(0, 7), [assetIds])

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

const LpGrid: React.FC<{ assetIds: AssetId[]; selectedChainId?: ChainId; isLoading: boolean }> = ({
  assetIds,
  selectedChainId,
  isLoading,
}) => {
  const history = useHistory()
  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )
  const { data: portalsAssets } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
  })

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      )
        // TODO(gomes): remove me when we have real data here for all categories
        .slice(0, 7),
    [assetIds, selectedChainId],
  )

  if (isLoading) {
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
  }

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) => {
        const maybePortalsApy = portalsAssets?.byId[assetId]?.metrics.apy
        const maybePortalsVolume = portalsAssets?.byId[assetId]?.metrics.volumeUsd1d

        return (
          <LpGridItem
            assetId={assetId}
            index={index}
            onClick={handleCardClick}
            apy={maybePortalsApy}
            volume={maybePortalsVolume}
          />
        )
      })}
    </Grid>
  )
}

const OneClickDefiAssets: React.FC<{
  selectedChainId: ChainId | undefined
}> = ({ selectedChainId }) => {
  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
  })

  return (
    <LpGrid
      assetIds={portalsAssets?.ids ?? []}
      selectedChainId={selectedChainId}
      isLoading={isPortalsAssetsLoading}
    />
  )
}

const ThorchainAssets: React.FC<{
  selectedChainId: ChainId | undefined
}> = ({ selectedChainId }) => {
  const dispatch = useAppDispatch()
  const { data: thorchainAssetIdsData, isLoading: isThorchainAssetIdsDataLoading } = useQuery({
    queryKey: ['thorchainAssets'],
    queryFn: thorchainSaversOpportunityIdsResolver,
    staleTime: Infinity,
    select: pools => pools.data,
  })

  useEffect(() => {
    ;(async () => {
      await dispatch(
        opportunitiesApi.endpoints.getOpportunityIds.initiate(
          {
            defiType: DefiType.Staking,
            defiProvider: DefiProvider.ThorchainSavers,
          },
          { forceRefetch: true },
        ),
      )

      await dispatch(
        opportunitiesApi.endpoints.getOpportunitiesMetadata.initiate(
          [
            {
              defiType: DefiType.Staking,
              defiProvider: DefiProvider.ThorchainSavers,
            },
          ],
          { forceRefetch: true },
        ),
      )
    })()
  }, [dispatch])

  return (
    <LpGrid
      assetIds={thorchainAssetIdsData ?? []}
      selectedChainId={selectedChainId}
      isLoading={isThorchainAssetIdsDataLoading}
    />
  )
}

const Row: React.FC<RowProps> = ({
  title,
  subtitle,
  supportedChainIds,
  children,
  displayChainDropdown,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(undefined)
  const isArbitrumNovaEnabled = useAppSelector(state => selectFeatureFlag(state, 'ArbitrumNova'))

  const chainIds = useMemo(() => {
    if (!supportedChainIds)
      return Object.values(KnownChainIds).filter(chainId => {
        if (!isArbitrumNovaEnabled && chainId === KnownChainIds.ArbitrumNovaMainnet) return false
        return true
      })

    return supportedChainIds
  }, [isArbitrumNovaEnabled, supportedChainIds])

  return (
    <Box mb={8}>
      <Flex justify='space-between' align='center' mb={4}>
        <Box me={4}>
          <Heading size='md' mb={1}>
            {title}
          </Heading>
          {subtitle && (
            <Text fontSize='sm' color='gray.500'>
              {subtitle}
            </Text>
          )}
        </Box>
        {displayChainDropdown && (
          <ChainDropdown
            chainIds={chainIds}
            chainId={selectedChainId}
            onClick={setSelectedChainId}
            showAll
            includeBalance
          />
        )}
      </Flex>
      {children(selectedChainId)}
    </Box>
  )
}

export const Recommended: React.FC = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])
  const assetIds = useAppSelector(selectAssetIds)

  // Fetch for all chains here so we know which chains to show in the dropdown
  const { isLoading: isPortalsAssetsLoading, data: allPortalsAssets } = usePortalsAssetsQuery({
    chainIds: undefined,
  })

  const { data: topMoversData, isLoading: isTopMoversDataLoading } = useTopMoversQuery()
  const { data: trendingData, isLoading: isTrendingDataLoading } = useTrendingQuery()
  const { data: recentlyAddedData, isLoading: isRecentlyAddedDataLoading } = useRecentlyAddedQuery()

  const rows = useMemo(
    () => [
      {
        title: 'Most Popular',
        component: () => (
          <AssetsGrid
            assetIds={assetIds}
            // TODO(gomes): This guy is still outstanding and waiting for product on what we do with this row
            isLoading={isPortalsAssetsLoading}
          />
        ),
        displayChainDropdown: false,
      },
      {
        title: translate('markets.categories.trending.title'),
        subtitle: translate('markets.categories.trending.subtitle', { percentage: '10' }),
        component: () => (
          <AssetsGrid assetIds={trendingData?.ids ?? []} isLoading={isTrendingDataLoading} />
        ),
        displayChainDropdown: false,
      },
      {
        title: translate('markets.categories.topMovers.title'),
        component: () => (
          <AssetsGrid assetIds={topMoversData?.ids ?? []} isLoading={isTopMoversDataLoading} />
        ),
        displayChainDropdown: false,
      },
      {
        title: translate('markets.categories.recentlyAdded.title'),
        component: () => (
          <AssetsGrid
            assetIds={recentlyAddedData?.ids ?? []}
            isLoading={isRecentlyAddedDataLoading}
          />
        ),
        displayChainDropdown: false,
      },
      {
        title: translate('markets.categories.oneClickDefiAssets.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <OneClickDefiAssets selectedChainId={selectedChainId} />
        ),
        supportedChainIds: allPortalsAssets?.chainIds,
        displayChainDropdown: true,
      },
      {
        title: translate('markets.categories.thorchainDefi.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <ThorchainAssets selectedChainId={selectedChainId} />
        ),
        displayChainDropdown: true,
      },
    ],
    [
      allPortalsAssets?.chainIds,
      assetIds,
      isPortalsAssetsLoading,
      isRecentlyAddedDataLoading,
      isTopMoversDataLoading,
      isTrendingDataLoading,
      recentlyAddedData?.ids,
      topMoversData?.ids,
      translate,
      trendingData?.ids,
    ],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box py={4} px={containerPaddingX}>
        {rows.map((row, i) => (
          <Row
            key={i}
            title={row.title}
            subtitle={row.subtitle}
            supportedChainIds={row.supportedChainIds}
            displayChainDropdown={row.displayChainDropdown}
          >
            {row.component}
          </Row>
        ))}
      </Box>
    </Main>
  )
}

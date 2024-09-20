import { Box, Flex, Grid, GridItem, Heading, Skeleton, Text } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import noop from 'lodash/noop'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetIds, selectFeatureFlag } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetCard } from './components/AssetCard'
import { CardWithSparkline } from './components/CardWithSparkline'
import { LpCard } from './components/LpCard'
import { usePortalsAssetsQuery } from './hooks/usePortalsAssetsQuery'
import { MarketsHeader } from './MarketsHeader'

type RowProps = {
  title: string
  subtitle?: string
  supportedChainIds: ChainId[] | undefined
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
  selectedChainId?: ChainId
  isLoading: boolean
}> = ({ assetIds, selectedChainId, isLoading }) => {
  const history = useHistory()
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
        const apy = portalsAssets?.byId[assetId]?.metrics.apy
        const volume24H = portalsAssets?.byId[assetId]?.metrics.volumeUsd1d

        if (index === 0) {
          return (
            <GridItem rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
              <CardWithSparkline assetId={assetId} onClick={handleCardClick} />
            </GridItem>
          )
        } else {
          return (
            <GridItem colSpan={colSpanSx}>
              <LpCard
                assetId={assetId}
                apy={apy ?? '0'}
                volume24H={volume24H ?? '0'}
                onClick={handleCardClick}
              />
            </GridItem>
          )
        }
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

const Row: React.FC<RowProps> = ({ title, subtitle, supportedChainIds, children }) => {
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
        <ChainDropdown
          chainIds={chainIds}
          chainId={selectedChainId}
          onClick={setSelectedChainId}
          showAll
          includeBalance
        />
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

  const rows = useMemo(
    () => [
      {
        title: 'Most Popular',
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.trending.title'),
        subtitle: translate('markets.categories.trending.subtitle', { percentage: '10' }),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.topMovements.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.recentlyAdded.title'),
        // TODO(gomes): loading state when implemented
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.oneClickDefiAssets.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <OneClickDefiAssets selectedChainId={selectedChainId} />
        ),
        supportedChainIds: allPortalsAssets?.chainIds,
      },
      {
        title: translate('markets.categories.thorchainDefi.title'),
        component: (selectedChainId: ChainId | undefined) => (
          <LpGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
    ],
    [allPortalsAssets?.chainIds, assetIds, isPortalsAssetsLoading, translate],
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
          >
            {row.component}
          </Row>
        ))}
      </Box>
    </Main>
  )
}

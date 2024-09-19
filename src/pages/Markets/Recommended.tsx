import { Box, Flex, Grid, GridItem, Heading, Text } from '@chakra-ui/react'
import { type AssetId, type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
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

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) =>
        index === 0 ? (
          <GridItem rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
            <CardWithSparkline
              key={assetId}
              assetId={assetId}
              onClick={handleCardClick}
              isLoading={isLoading}
            />
          </GridItem>
        ) : (
          <GridItem colSpan={colSpanSx}>
            <AssetCard
              key={assetId}
              assetId={assetId}
              onClick={handleCardClick}
              isLoading={isLoading}
            />
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

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) => {
        const apy = portalsAssets?.byId[assetId]?.metrics.apy
        const volume24H = portalsAssets?.byId[assetId]?.metrics.volumeUsd1d

        if (index === 0) {
          return (
            <GridItem rowSpan={rowSpanSparklineSx} colSpan={colSpanSparklineSx}>
              <CardWithSparkline
                assetId={assetId}
                onClick={handleCardClick}
                isLoading={isLoading}
              />
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
                isLoading={isLoading}
              />
            </GridItem>
          )
        }
      })}
    </Grid>
  )
}

const Row: React.FC<RowProps> = ({ title, subtitle, children }) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(undefined)
  const isArbitrumNovaEnabled = useAppSelector(state => selectFeatureFlag(state, 'ArbitrumNova'))

  const chainIds = useMemo(
    () =>
      Object.values(KnownChainIds).filter(chainId => {
        if (!isArbitrumNovaEnabled && chainId === KnownChainIds.ArbitrumNovaMainnet) return false
        return true
      }),
    [isArbitrumNovaEnabled],
  )

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

  const { isLoading: isPortalsAssetsLoading, data: portalsAssets } = usePortalsAssetsQuery({
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
          <LpGrid
            assetIds={portalsAssets?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isPortalsAssetsLoading}
          />
        ),
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
    [assetIds, isPortalsAssetsLoading, portalsAssets, translate],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box py={4} px={containerPaddingX}>
        {rows.map((row, i) => (
          <Row key={i} title={row.title} subtitle={row.subtitle}>
            {row.component}
          </Row>
        ))}
      </Box>
    </Main>
  )
}

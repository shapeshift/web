import { Box, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { type AssetId, type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetIds } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AssetCard } from './components/AssetCard'
import { CardWithSparkline } from './components/CardWithSparkline'
import { LpCard } from './components/LpCard'
import { usePortalsAssetsQuery } from './hooks/usePortalsAssetsQuery'
import { MarketsHeader } from './MarketsHeader'

type RowProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  selectedChainId: ChainId | undefined
  setSelectedChainId: (chainId: ChainId | undefined) => void
}

const gridColumnSx = { base: 1, md: 2, lg: 4 }
const gridTemplateColumnSx = { base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }

const AssetsGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
}> = ({ assetIds, selectedChainId, isLoading }) => {
  const dispatch = useAppDispatch()
  const history = useHistory()
  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      )
        // TODO(gomes): remove me when we have real data here for all categories
        .slice(0, 8),
    [assetIds, selectedChainId],
  )

  useEffect(() => {
    filteredAssetIds.forEach(assetId =>
      dispatch(marketApi.endpoints.findByAssetId.initiate(assetId)),
    )
  }, [assetIds, dispatch, filteredAssetIds])

  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )

  return (
    <SimpleGrid columns={gridColumnSx} gridTemplateColumns={gridTemplateColumnSx} spacing={4}>
      {filteredAssetIds.map((assetId, index) =>
        index === 0 ? (
          <CardWithSparkline
            key={assetId}
            assetId={assetId}
            onClick={handleCardClick}
            isLoading={isLoading}
          />
        ) : (
          <AssetCard
            key={assetId}
            assetId={assetId}
            onClick={handleCardClick}
            isLoading={isLoading}
          />
        ),
      )}
    </SimpleGrid>
  )
}

const LpGrid: React.FC<{ assetIds: AssetId[]; selectedChainId?: ChainId; isLoading: boolean }> = ({
  assetIds,
  selectedChainId,
  isLoading,
}) => {
  const dispatch = useAppDispatch()
  const history = useHistory()
  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )
  const { data: portalsAssets } = usePortalsAssetsQuery()

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      )
        // TODO(gomes): remove me when we have real data here for all categories
        .slice(0, 8),
    [assetIds, selectedChainId],
  )

  useEffect(() => {
    filteredAssetIds.map(assetId => dispatch(marketApi.endpoints.findByAssetId.initiate(assetId)))
  }, [assetIds, dispatch, filteredAssetIds])

  return (
    <SimpleGrid columns={gridColumnSx} gridTemplateColumns={gridTemplateColumnSx} spacing={4}>
      {filteredAssetIds.map((assetId, index) => {
        const apy = portalsAssets?.find(({ asset }) => asset.assetId === assetId)?.tokenInfo
          ?.metrics.apy
        const volume24H = portalsAssets?.find(({ asset }) => asset.assetId === assetId)?.tokenInfo
          ?.metrics.volumeUsd1d

        if (index === 0) {
          return (
            <CardWithSparkline assetId={assetId} onClick={handleCardClick} isLoading={isLoading} />
          )
        } else {
          return (
            <LpCard
              assetId={assetId}
              apy={apy ?? '0'}
              volume24H={volume24H ?? '0'}
              onClick={handleCardClick}
              isLoading={isLoading}
            />
          )
        }
      })}
    </SimpleGrid>
  )
}

const Row: React.FC<RowProps> = ({
  title,
  subtitle,
  children,
  selectedChainId,
  setSelectedChainId,
}) => {
  const chainIds = Object.values(KnownChainIds)

  return (
    <Box mb={8}>
      <Flex justify='space-between' align='center' mb={4}>
        <Box>
          <Heading size='lg' mb={1}>
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
      {children}
    </Box>
  )
}

export const Recommended: React.FC = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])
  const assetIds = useAppSelector(selectAssetIds)
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()

  const { isLoading: isPortalsAssetsLoading, data: portalsAssets } = usePortalsAssetsQuery()

  const rows = useMemo(
    () => [
      {
        title: 'Most Popular',
        component: (
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
        subtitle: translate('markets.categories.trending.subtitle'),
        component: (
          <AssetsGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.topMovers.title'),
        component: (
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
        component: (
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
        component: (
          <LpGrid
            assetIds={portalsAssets?.map(({ asset }) => asset.assetId) ?? []}
            selectedChainId={selectedChainId}
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
      {
        title: translate('markets.categories.thorchainDefi.title'),
        component: (
          <LpGrid
            assetIds={assetIds}
            selectedChainId={selectedChainId}
            // TODO(gomes): loading state when implemented
            isLoading={isPortalsAssetsLoading}
          />
        ),
      },
    ],
    [assetIds, isPortalsAssetsLoading, portalsAssets, selectedChainId, translate],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box p={4}>
        {rows.map((row, i) => (
          <Row
            key={i}
            title={row.title}
            subtitle={row.subtitle}
            selectedChainId={selectedChainId}
            setSelectedChainId={setSelectedChainId}
          >
            {row.component}
          </Row>
        ))}
      </Box>
    </Main>
  )
}

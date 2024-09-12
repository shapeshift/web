import { Box, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { type AssetId, type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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

const AssetsGrid: React.FC<{ assetIds: AssetId[]; selectedChainId?: ChainId }> = ({
  assetIds,
  selectedChainId,
}) => {
  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, 8),
    [assetIds, selectedChainId],
  )

  return (
    <SimpleGrid columns={gridColumnSx} gridTemplateColumns={gridTemplateColumnSx} spacing={4}>
      {filteredAssetIds.map((assetId, index) =>
        index === 0 ? (
          <CardWithSparkline key={assetId} assetId={assetId} />
        ) : (
          <AssetCard key={assetId} assetId={assetId} />
        ),
      )}
    </SimpleGrid>
  )
}

const LpGrid: React.FC<{ assetIds: AssetId[]; selectedChainId?: ChainId }> = ({
  assetIds,
  selectedChainId,
}) => {
  const { data: portalsData } = usePortalsAssetsQuery()

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, 8),
    [assetIds, selectedChainId],
  )

  return (
    <SimpleGrid columns={gridColumnSx} gridTemplateColumns={gridTemplateColumnSx} spacing={4}>
      {filteredAssetIds.map((assetId, index) => {
        const apy = portalsData?.find(({ asset }) => asset.assetId === assetId)?.tokenInfo?.metrics
          .apy
        const volume24H = portalsData?.find(({ asset }) => asset.assetId === assetId)?.tokenInfo
          ?.metrics.volumeUsd1d
        return index === 0 ? (
          <CardWithSparkline key={assetId} assetId={assetId} />
        ) : (
          <LpCard key={assetId} assetId={assetId} apy={apy ?? '0'} volume24H={volume24H ?? '0'} />
        )
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

  const { data: portalsData } = usePortalsAssetsQuery()

  const rows = useMemo(
    () => [
      {
        title: 'Most Popular',
        component: <AssetsGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
      {
        title: 'Trending',
        subtitle: 'These are top assets that have jumped 10% or more',
        component: <AssetsGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
      {
        title: 'Top Movers',
        component: <AssetsGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
      {
        title: 'Recently Added',
        component: <AssetsGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
      {
        title: 'One Click DeFi Assets',
        component: (
          <LpGrid
            assetIds={portalsData?.map(({ asset }) => asset.assetId) ?? []}
            selectedChainId={selectedChainId}
          />
        ),
      },
      {
        title: 'THORChain DeFi',
        component: <LpGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
    ],
    [assetIds, portalsData, selectedChainId],
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

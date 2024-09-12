import { Box, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetIds, selectWalletConnectedChainIdsSorted } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetCard } from './components/AssetCard'
import { LpCard } from './components/LpCard'
import { MarketsHeader } from './MarketsHeader'

type RowProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  chainIds: ChainId[]
}

const gridColumnSx = { base: 1, md: 2, lg: 4 }

const AssetsGrid: React.FC<{ assetIds: AssetId[] }> = ({ assetIds }) => (
  <SimpleGrid columns={gridColumnSx} spacing={4}>
    {assetIds.map(assetId => (
      <AssetCard key={assetId} assetId={assetId} />
    ))}
  </SimpleGrid>
)

const LpGrid: React.FC<{ assetIds: AssetId[] }> = ({ assetIds }) => (
  <SimpleGrid columns={gridColumnSx} spacing={4}>
    {assetIds.map(assetId => (
      <LpCard key={assetId} assetId={assetId} apy={'42'} volume24H={'10000'} />
    ))}
  </SimpleGrid>
)

const Row: React.FC<RowProps> = ({ title, subtitle, children, chainIds }) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()

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
  const portfolioChainIds = useAppSelector(selectWalletConnectedChainIdsSorted)
  const assetIds = useAppSelector(selectAssetIds)

  const rows = useMemo(
    () => [
      {
        title: 'Most Popular',
        component: <AssetsGrid assetIds={assetIds.slice(0, 4)} />,
      },
      {
        title: 'Trending',
        subtitle: 'These are top assets that have jumped 10% or more',
        component: <AssetsGrid assetIds={assetIds.slice(0, 4)} />,
      },
      {
        title: 'Top Movers',
        component: <AssetsGrid assetIds={assetIds.slice(0, 4)} />,
      },
      {
        title: 'Recently Added',
        component: <AssetsGrid assetIds={assetIds.slice(0, 4)} />,
      },
      {
        title: 'One Click DeFi Assets',
        component: <LpGrid assetIds={assetIds.slice(0, 4)} />,
      },
      {
        title: 'THORChain DeFi',
        component: <LpGrid assetIds={assetIds.slice(0, 4)} />,
      },
    ],
    [assetIds],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box p={4}>
        {rows.map((row, i) => (
          <Row key={i} title={row.title} subtitle={row.subtitle} chainIds={portfolioChainIds}>
            {row.component}
          </Row>
        ))}
      </Box>
    </Main>
  )
}

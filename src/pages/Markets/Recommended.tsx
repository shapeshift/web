import { Box, Card, CardBody, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import {
  ASSET_NAMESPACE,
  type AssetId,
  bscChainId,
  type ChainId,
  fromAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { HistoryTimeframe, KnownChainIds } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { noop } from 'lodash'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { PORTALS_NETWORK_TO_CHAIN_ID } from 'lib/portals/constants'
import { fetchPortalsPlatforms, fetchPortalsTokens, portalTokenToAsset } from 'lib/portals/utils'
import { markdownLinkToHTML } from 'lib/utils'
import {
  selectAssetById,
  selectAssetIds,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { AssetCard } from './components/AssetCard'
import { LpCard } from './components/LpCard'
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

const CardWithSparkline: React.FC<{
  assetId: AssetId
}> = ({ assetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  if (!asset || !marketData) return null

  const changePercent24Hr = marketData.changePercent24Hr

  return (
    <Card height='380px' width='100%' borderRadius='xl'>
      <CardBody display='flex' flexDirection='column' justifyContent='space-between' p={4}>
        <Flex align='center' mb={2}>
          <AssetIcon assetId={assetId} size='md' mr={3} />
          <Box>
            <Text fontWeight='bold' fontSize='lg'>
              {asset.name}
            </Text>
            <Text fontSize='sm' color='gray.500'>
              {asset.symbol}
            </Text>
          </Box>
        </Flex>
        <Box mb={2}>
          <Amount.Fiat value={marketData.price} fontWeight='bold' fontSize='2xl' />
          <Flex align='center' mt={1}>
            <Amount.Percent
              autoColor
              value={bnOrZero(changePercent24Hr).times(0.01).toString()}
              fontWeight='medium'
            />
          </Flex>
        </Box>
        <Box mb={4} flex={1} overflow='hidden'>
          <Text fontSize='sm' color='gray.500' noOfLines={3}>
            <ParsedHtml
              color='text.subtle'
              innerHtml={markdownLinkToHTML(asset.description || '')}
            />
          </Text>
        </Box>
        <Box height='120px'>
          <PriceChart
            assetId={assetId}
            timeframe={HistoryTimeframe.DAY}
            percentChange={changePercent24Hr}
            setPercentChange={noop}
            chartHeight='120px'
            hideAxis={true}
          />
        </Box>
      </CardBody>
    </Card>
  )
}

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
          <LpCard key={assetId} assetId={assetId} apy={'42'} volume24H={'10000'} />
        ),
      )}
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

  const { data: portalsPlatformsData } = useQuery({
    queryKey: ['portalsPlatforms'],
    queryFn: () => fetchPortalsPlatforms(),
  })
  const { data: portalsData } = useQuery({
    queryKey: ['portalsAssets'],
    queryFn: portalsPlatformsData
      ? () =>
          fetchPortalsTokens({
            limit: '10',
            chainIds: undefined,
            sortBy: 'apy',
            sortDirection: 'desc',
          })
      : skipToken,
    select: tokens => {
      if (!portalsPlatformsData) return

      return tokens
        .map(token => {
          const chainId = PORTALS_NETWORK_TO_CHAIN_ID[token.network]
          if (!chainId) return undefined

          const assetId = toAssetId({
            chainId,
            assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
            assetReference: token.address,
          })
          const feeAsset = selectFeeAssetById(store.getState(), assetId)
          if (!feeAsset) return undefined

          return {
            asset: portalTokenToAsset({
              token,
              portalsPlatforms: portalsPlatformsData,
              nativeAsset: feeAsset,
              chainId,
            }),
            // TODO(gomes): do we even need TokenInfo here? Market-data should contain all we need and we shouldn't need to use raw Portals data?
            tokenInfo: token,
          }
        })
        .filter(isSome)
    },
  })

  console.log({ portalsData })

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
        component: <LpGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
      {
        title: 'THORChain DeFi',
        component: <LpGrid assetIds={assetIds} selectedChainId={selectedChainId} />,
      },
    ],
    [assetIds, selectedChainId],
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

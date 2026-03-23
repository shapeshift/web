import type { GridProps } from '@chakra-ui/react'
import {
  Button,
  CircularProgress,
  Flex,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { permillToDecimal } from '@/lib/chainflip/utils'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { ChainflipLendingHeader } from '@/pages/ChainflipLending/components/ChainflipLendingHeader'
import { Dashboard } from '@/pages/ChainflipLending/components/Dashboard'
import { InitView } from '@/pages/ChainflipLending/components/InitView'
import type { ChainflipLendingPoolWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const marketRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

const mobileDisplay = { base: 'none', md: 'flex' }
const mobilePadding = { base: 4, lg: 4, xl: 0 }
const listMargin = { base: 0, lg: 0, xl: -4 }

type MarketRowProps = {
  pool: ChainflipLendingPoolWithFiat
  onViewMarket: (assetId: AssetId) => void
}

const MarketRow = ({ pool, onViewMarket }: MarketRowProps) => {
  const asset = useAppSelector(state =>
    pool.assetId ? selectAssetById(state, pool.assetId) : undefined,
  )
  const handleClick = useCallback(() => {
    if (pool.assetId) onViewMarket(pool.assetId)
  }, [pool.assetId, onViewMarket])

  const utilisationPercent = useMemo(
    () => permillToDecimal(pool.pool.utilisation_rate),
    [pool.pool.utilisation_rate],
  )

  const utilisationNumber = useMemo(
    () => bnOrZero(utilisationPercent).times(100).toNumber(),
    [utilisationPercent],
  )

  const utilisationColor = useMemo(() => {
    if (utilisationNumber >= 90) return 'red.400'
    if (utilisationNumber >= 70) return 'orange.400'
    return 'blue.400'
  }, [utilisationNumber])

  if (!pool.assetId) return null

  return (
    <Button
      variant='ghost'
      display='grid'
      gridTemplateColumns={marketRowGrid}
      columnGap={4}
      alignItems='center'
      textAlign='left'
      py={4}
      width='full'
      height='auto'
      color='text.base'
      onClick={handleClick}
      data-testid={`chainflip-lending-market-row-${asset?.symbol?.toLowerCase() ?? 'unknown'}`}
    >
      <AssetCell assetId={pool.assetId} />
      <Flex display={mobileDisplay}>
        <Amount.Percent value={pool.supplyApy} autoColor />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Fiat value={pool.totalAmountFiat} />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Percent value={pool.borrowRate} autoColor />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Fiat
          value={bnOrZero(pool.totalAmountFiat).minus(pool.availableAmountFiat).toFixed(2)}
        />
      </Flex>
      <HStack spacing={2}>
        <CircularProgress
          value={utilisationNumber}
          size='24px'
          thickness='10px'
          color={utilisationColor}
          trackColor='whiteAlpha.100'
        />
        <Amount.Percent value={utilisationPercent} />
      </HStack>
    </Button>
  )
}

const MarketsTable = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { pools, isLoading } = useChainflipLendingPools()

  const handleViewMarket = useCallback(
    (assetId: AssetId) => {
      navigate(`/chainflip-lending/pool/${assetId}`)
    },
    [navigate],
  )

  const sortedPools = useMemo(
    () => [...pools].sort((a, b) => bnOrZero(b.supplyApy).minus(a.supplyApy).toNumber()),
    [pools],
  )

  const marketRows = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={16} />)
    }

    return sortedPools.map(pool =>
      pool.assetId ? (
        <MarketRow key={pool.assetId} pool={pool} onViewMarket={handleViewMarket} />
      ) : null,
    )
  }, [isLoading, sortedPools, handleViewMarket])

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Text
          translation='chainflipLending.dashboard.lendingMarkets'
          fontWeight='bold'
          fontSize='lg'
        />
        <Text
          translation='chainflipLending.dashboard.lendingMarketsDescription'
          color='text.subtle'
          fontSize='sm'
        />
      </Stack>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={marketRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='chainflipLending.poolHeader' />
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.supplyApyTooltip')}>
              <Text translation='chainflipLending.supplyApy' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.totalSuppliedTooltip')}>
              <Text translation='chainflipLending.totalSupplied' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.borrowAprTooltip')}>
              <Text translation='chainflipLending.borrowApr' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.totalBorrowedTooltip')}>
              <Text translation='chainflipLending.totalBorrowed' />
            </HelperTooltip>
          </Flex>
          <HelperTooltip label={translate('chainflipLending.utilisationTooltip')}>
            <Text translation='chainflipLending.utilisation' />
          </HelperTooltip>
        </SimpleGrid>
        <Stack mx={listMargin}>{marketRows}</Stack>
      </Stack>
    </Stack>
  )
}

export const Markets = () => {
  const translate = useTranslate()
  const { accountId } = useChainflipLendingAccount()
  const [tabIndex, setTabIndex] = useState(0)

  const headerComponent = useMemo(() => <ChainflipLendingHeader />, [])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title='Chainflip Lending' />
      <Stack spacing={6}>
        {accountId ? (
          <Tabs index={tabIndex} onChange={setTabIndex} variant='unstyled'>
            <TabList data-testid='chainflip-lending-tabs' gap={6}>
              <Tab
                px={0}
                py={2}
                color='text.subtle'
                fontWeight='bold'
                _selected={{
                  color: 'text.base',
                  borderBottomWidth: 2,
                  borderColor: 'text.base',
                }}
              >
                {translate('chainflipLending.myDashboard')}
              </Tab>
              <Tab
                px={0}
                py={2}
                color='text.subtle'
                fontWeight='bold'
                _selected={{
                  color: 'text.base',
                  borderBottomWidth: 2,
                  borderColor: 'text.base',
                }}
              >
                {translate('chainflipLending.markets')}
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <Dashboard />
              </TabPanel>
              <TabPanel px={0} data-testid='chainflip-lending-markets'>
                <MarketsTable />
              </TabPanel>
            </TabPanels>
          </Tabs>
        ) : (
          <InitView />
        )}
      </Stack>
    </Main>
  )
}

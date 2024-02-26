import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Container,
  Flex,
  Heading,
  IconButton,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import type { Property } from 'csstype'
import React, { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { generatePath, useHistory, useParams } from 'react-router'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Main } from 'components/Layout/Main'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import {
  calculateTVL,
  get24hSwapChangePercentage,
  getFees,
  getVolume,
} from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

import { Faq } from '../components/Faq'
import { PoolIcon } from '../components/PoolIcon'
import { PoolInfo } from '../components/PoolInfo'
import { usePools } from '../queries/hooks/usePools'
import { PairRates } from './components/PairRates'
import { PoolChart } from './components/PoolChart'

type MatchParams = {
  poolAssetId: string
}

const containerPadding = { base: 6, '2xl': 8 }
const maxWidth = { base: '100%', md: '350px' }

const subHeaderFlexDirection: ResponsiveValue<Property.FlexDirection> = {
  base: 'column',
  md: 'row',
}

type PoolHeaderProps = {
  assetIds: AssetId[]
  name: string
}

const PoolHeader: React.FC<PoolHeaderProps> = ({ assetIds, name }) => {
  const history = useHistory()
  const translate = useTranslate()

  const handleBack = useCallback(() => history.push('/pools'), [history])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  return (
    <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
      <Flex gap={4} alignItems='center'>
        <IconButton icon={backIcon} aria-label={translate('pools.pools')} onClick={handleBack} />
        <Flex gap={4} alignItems='center'>
          <PoolIcon assetIds={assetIds} size='sm' />
          <Heading as='h3'>{name}</Heading>
        </Flex>
      </Flex>
    </Container>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }

export const Pool = () => {
  const params = useParams<MatchParams>()
  const translate = useTranslate()
  const history = useHistory()

  const { data: pools } = usePools()

  const pool = useMemo(() => {
    return pools?.find(pool => pool.asset === params.poolAssetId)
  }, [params.poolAssetId, pools])

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: pool?.assetId,
    enabled: !!pool,
    swapperName: SwapperName.Thorchain,
  })

  const poolAssetIds = useMemo(() => {
    if (!pool) return []

    return [pool.assetId, thorchainAssetId]
  }, [pool])

  const handleAddLiquidityClick = useCallback(() => {
    history.push(
      generatePath('/pools/add/:poolAssetId', {
        poolAssetId: params.poolAssetId,
      }),
    )
  }, [params.poolAssetId, history])

  const handleTradeClick = useCallback(() => {
    if (!pool) return

    history.push(`/trade/${pool?.assetId}`)
  }, [pool, history])

  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, pool?.assetId ?? ''))

  const { data: volume24h } = useQuery({
    ...reactQueries.midgard.swapsData(pool?.assetId, '24h'),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    staleTime: Infinity,
    enabled: !!pool?.assetId,
    select: data => getVolume(runeMarketData.price, data),
  })

  const { data: swapDataPrevious24h } = useQuery({
    ...reactQueries.midgard.swapsData(pool?.assetId, 'previous24h'),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    staleTime: Infinity,
    enabled: !!pool?.assetId,
  })

  const { data: swapData24h } = useQuery({
    ...reactQueries.midgard.swapsData(pool?.assetId, '24h'),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    staleTime: Infinity,
    enabled: !!pool?.assetId,
  })

  const fees24h = useMemo(() => {
    if (!swapData24h) return

    return getFees(runeMarketData.price, assetMarketData.price, swapData24h)
  }, [swapData24h, runeMarketData.price, assetMarketData.price])

  const swap24hChange = useMemo(() => {
    if (!swapData24h || !swapDataPrevious24h) return

    return get24hSwapChangePercentage(
      runeMarketData.price,
      assetMarketData.price,
      swapData24h,
      swapDataPrevious24h,
    )
  }, [swapData24h, swapDataPrevious24h, runeMarketData.price, assetMarketData.price])

  const { data: tvl24hChange } = useQuery({
    ...reactQueries.thorchainLp.tvl24hChange(pool?.assetId),
  })

  const { data: allTimeVolume } = useQuery({
    ...reactQueries.thorchainLp.allTimeVolume(pool?.assetId, runeMarketData.price),
  })

  const tvl = useMemo(() => {
    if (!pool) return { tvl: '0', assetAmountCryptoPrecision: '0', runeAmountCryptoPrecision: '0' }

    return calculateTVL(pool.assetDepth, pool.runeDepth, runeMarketData.price)
  }, [pool, runeMarketData.price])

  const headerComponent = useMemo(
    () => <PoolHeader assetIds={poolAssetIds} name={pool?.name ?? ''} />,
    [pool?.name, poolAssetIds],
  )

  const addIcon = useMemo(() => <FaPlus />, [])
  const swapIcon = useMemo(() => <SwapIcon />, [])

  if (!pool) return null

  return (
    <Main headerComponent={headerComponent}>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Flex
            gap={4}
            justifyContent='space-between'
            alignItems='center'
            flexDir={subHeaderFlexDirection}
          >
            <PairRates assetIds={poolAssetIds} />
            <Flex gap={4}>
              <Tooltip
                label={translate('defi.modals.saversVaults.haltedTitle')}
                isDisabled={isTradingActive === undefined || isTradingActive === true}
                hasArrow
              >
                <Button
                  isDisabled={isTradingActiveLoading || isTradingActive === false}
                  onClick={handleAddLiquidityClick}
                  leftIcon={addIcon}
                >
                  {translate('pools.addLiquidity')}
                </Button>
              </Tooltip>
              <Button
                colorScheme='blue'
                leftIcon={swapIcon}
                isDisabled={isTradingActiveLoading || isTradingActive === false}
                onClick={handleTradeClick}
              >
                {translate('trade.trade')}
              </Button>
            </Flex>
          </Flex>
          <Flex flexWrap='wrap' gap={4}>
            <Card width='full' maxWidth={maxWidth}>
              <CardFooter gap={6} display='flex' flexDir='column' px={8} py={8}>
                <PoolInfo
                  volume24h={volume24h}
                  volume24hChange={swap24hChange?.volumeChangePercentage}
                  fee24hChange={swap24hChange?.feeChangePercentage}
                  fees24h={fees24h}
                  allTimeVolume={allTimeVolume}
                  apy={pool.annualPercentageRate}
                  tvl={tvl.tvl}
                  runeTvlCryptoPrecision={fromThorBaseUnit(pool.runeDepth).toFixed()}
                  assetTvlCryptoPrecision={fromThorBaseUnit(pool.assetDepth).toFixed()}
                  tvl24hChange={tvl24hChange ?? 0}
                  assetIds={poolAssetIds}
                  direction='column'
                  display='full'
                  reverse
                />
              </CardFooter>
            </Card>
            <Card flex={1}>
              <CardBody>
                <PoolChart />
              </CardBody>
            </Card>
          </Flex>
          <Faq />
        </Stack>
      </Flex>
    </Main>
  )
}

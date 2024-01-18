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
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import type { Property } from 'csstype'
import React, { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useHistory, useParams, useRouteMatch } from 'react-router'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Main } from 'components/Layout/Main'
import {
  calculateTVL,
  get24hSwapChangePercentage,
  get24hTvlChangePercentage,
  getAllTimeVolume,
  getFees,
  getVolume,
} from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

import { Faq } from '../components/Faq'
import { PoolIcon } from '../components/PoolIcon'
import { PoolInfo } from '../components/PoolInfo'
import { usePools } from '../hooks/usePools'
import { PairRates } from './components/PairRates'
import { PoolChart } from './components/PoolChart'

type MatchParams = {
  poolAccountId?: AccountId
  poolOpportunityId?: string
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
  const translate = useTranslate()
  const history = useHistory()
  const { path } = useRouteMatch()
  const handleBack = useCallback(() => {
    const isPoolPage = matchPath('/pools/positions/:poolAssetId', path)
    const isPoolAccountPage = matchPath('/pools/poolAccount/:poolAccountId/:poolAssetId', path)

    if (isPoolAccountPage) {
      history.push('/pools/positions')
    } else if (isPoolPage) {
      history.push('/pools')
    }
  }, [history, path])
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

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined
    const routeOpportunityId = decodeURIComponent(params.poolOpportunityId ?? '')

    return parsedPools.find(pool => pool.opportunityId === routeOpportunityId)
  }, [params, parsedPools])

  const poolAssetIds = useMemo(() => {
    if (!foundPool) return []

    return [foundPool.assetId, thorchainAssetId]
  }, [foundPool])

  const headerComponent = useMemo(
    () => <PoolHeader assetIds={poolAssetIds} name={foundPool?.name ?? ''} />,
    [foundPool?.name, poolAssetIds],
  )

  const handleAddLiquidityClick = useCallback(() => {
    history.push(
      generatePath('/pools/add/:poolOpportunityId', {
        poolOpportunityId: foundPool?.opportunityId ?? '',
      }),
    )
  }, [foundPool?.opportunityId, history])

  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataById(state, foundPool?.assetId ?? ''),
  )

  const { data: volume24h } = useQuery({
    queryKey: ['thorchainPoolVolume24h', foundPool?.assetId ?? ''],
    queryFn: () => (foundPool ? getVolume('24h', foundPool.assetId, runeMarketData.price) : ''),
  })

  const { data: swap24hChange } = useQuery({
    queryKey: ['get24hSwapChangePercentage', foundPool?.assetId ?? ''],
    queryFn: () =>
      foundPool
        ? get24hSwapChangePercentage(foundPool.assetId, runeMarketData.price, assetMarketData.price)
        : null,
  })

  const { data: tvl24hChange } = useQuery({
    queryKey: ['get24hTvlChangePercentage', foundPool?.assetId ?? ''],
    queryFn: () =>
      foundPool ? get24hTvlChangePercentage(foundPool.assetId) : Promise.resolve(null),
  })

  const { data: fees24h } = useQuery({
    queryKey: ['thorchainPoolFees24h', foundPool?.assetId ?? ''],
    queryFn: () =>
      foundPool
        ? getFees('24h', foundPool.assetId, runeMarketData.price, assetMarketData.price)
        : '',
  })

  const { data: allTimeVolume } = useQuery({
    queryKey: ['thorchainPoolVolumeAllTime', foundPool?.assetId ?? ''],
    queryFn: () => (foundPool ? getAllTimeVolume(foundPool.assetId, runeMarketData.price) : ''),
  })

  const tvl = useMemo(() => {
    if (!foundPool)
      return { tvl: '0', assetAmountCrytoPrecision: '0', runeAmountCryptoPrecision: '0' }

    return calculateTVL(foundPool.assetDepth, foundPool.runeDepth, runeMarketData.price)
  }, [foundPool, runeMarketData.price])

  const addIcon = useMemo(() => <FaPlus />, [])
  const swapIcon = useMemo(() => <SwapIcon />, [])

  if (!foundPool) return null

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
              <Button onClick={handleAddLiquidityClick} leftIcon={addIcon}>
                {translate('pools.addLiquidity')}
              </Button>
              <Button colorScheme='blue' leftIcon={swapIcon}>
                {translate('trade.trade')}
              </Button>
            </Flex>
          </Flex>
          <Flex flexWrap='wrap' gap={4}>
            <Card width='full' maxWidth={maxWidth}>
              <CardFooter gap={6} display='flex' flexDir='column' px={8} py={8}>
                <PoolInfo
                  volume24h={volume24h ?? '0'}
                  volume24hChange={swap24hChange?.volumeChangePercentage ?? 0}
                  fee24hChange={swap24hChange?.feeChangePercentage ?? 0}
                  fees24h={fees24h ?? '0'}
                  allTimeVolume={allTimeVolume ?? '0'}
                  apy={foundPool.poolAPY ?? '0'}
                  tvl={tvl.tvl}
                  runeTvl={tvl.runeAmountCryptoPrecision}
                  assetTvl={tvl.assetAmountCrytoPrecision}
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

import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  IconButton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useParams, useRouteMatch } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { DynamicComponent } from 'components/DynamicComponent'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import {
  calculateEarnings,
  calculateTVL,
  get24hSwapChangePercentage,
  getAllTimeVolume,
  getEarnings,
  getFees,
  getVolume,
} from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from '../components/PoolIcon'
import { usePools } from '../hooks/usePools'
import { useUserLpData } from '../hooks/useUserLpData'
import { Faq } from './components/Faq'
import { PoolInfo } from './components/PoolInfo'

type MatchParams = {
  poolAccountId?: AccountId
  poolOpportunityId?: string
}

const containerPadding = { base: 6, '2xl': 8 }
const tabSelected = { color: 'text.base' }
const maxWidth = { base: '100%', md: '450px' }
const responsiveFlex = { base: 'auto', lg: 1 }
const PoolHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const { path } = useRouteMatch()
  const handleBack = useCallback(() => {
    const isPoolPage = matchPath('/lending/pool/:poolAssetId', path)
    const isPoolAccountPage = matchPath('/lending/poolAccount/:poolAccountId/:poolAssetId', path)

    if (isPoolAccountPage) {
      history.push('/lending/loans')
    } else if (isPoolPage) {
      history.push('/lending')
    }
  }, [history, path])
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  return (
    <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
      <Flex gap={4} alignItems='center'>
        <IconButton icon={backIcon} aria-label={translate('pools.pools')} onClick={handleBack} />
        <Heading>{translate('pools.pools')}</Heading>
      </Flex>
    </Container>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }

export const Pool = () => {
  const params = useParams<MatchParams>()

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined
    const routeOpportunityId = decodeURIComponent(params.poolOpportunityId ?? '')

    return parsedPools.find(pool => pool.opportunityId === routeOpportunityId)
  }, [params, parsedPools])

  const { data: userData } = useUserLpData({ assetId: foundPool?.assetId ?? '' })

  const foundUserData = useMemo(() => {
    if (!userData) return undefined

    // TODO(gomes): when routed from the "Your positions" page, we will want to handle multi-account and narrow by AccountId
    // TODO(gomes): when supporting multi account for this, we will want to either handle default, highest balance account as default,
    // or, probably better from an architectural standpoint, have each account position be its separate row
    return userData?.find(data => data.opportunityId === foundPool?.opportunityId)
  }, [foundPool?.opportunityId, userData])

  const [stepIndex, setStepIndex] = useState<number>(0)

  const translate = useTranslate()

  const headerComponent = useMemo(() => <PoolHeader />, [])

  const poolAssetIds = useMemo(() => {
    if (!foundPool) return []

    return [foundPool.assetId, thorchainAssetId]
  }, [foundPool])

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))

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

  const { data: thornodePoolData } = useQuery({
    enabled: Boolean(foundPool),
    queryKey: ['thornodePoolData', foundPool?.assetId ?? ''],
    queryFn: async () => {
      const poolAssetId = assetIdToPoolAssetId({ assetId: foundPool?.assetId ?? '' })
      const { data: poolData } = await axios.get<ThornodePoolResponse>(
        `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
      )

      return poolData
    },
  })

  const { data: earnings } = useQuery({
    enabled: Boolean(foundUserData && thornodePoolData),
    queryKey: ['thorchainearnings', foundUserData?.dateFirstAdded ?? ''],
    queryFn: () =>
      foundUserData ? getEarnings({ from: foundUserData.dateFirstAdded }) : undefined,
    select: data => {
      if (!data || !foundUserData || !thornodePoolData) return null
      const poolAssetId = assetIdToPoolAssetId({ assetId: foundUserData.assetId })
      const foundHistoryPool = data.meta.pools.find(pool => pool.pool === poolAssetId)
      if (!foundHistoryPool) return null

      return calculateEarnings(
        foundHistoryPool.assetLiquidityFees,
        foundHistoryPool.runeLiquidityFees,
        foundUserData.poolShare,
        runeMarketData.price,
        assetMarketData.price,
      )
    },
  })

  const liquidityValueComponent = useMemo(
    () => <Amount.Fiat value={foundUserData?.totalValueFiatUserCurrency ?? '0'} fontSize='2xl' />,
    [foundUserData?.totalValueFiatUserCurrency],
  )

  const unclaimedFeesComponent = useMemo(
    () => <Amount.Fiat value={earnings?.totalEarningsFiatUserCurrency ?? '0'} fontSize='2xl' />,
    [earnings?.totalEarningsFiatUserCurrency],
  )

  const tvl = useMemo(() => {
    if (!foundPool) return '0'

    return calculateTVL(foundPool.assetDepth, foundPool.runeDepth, runeMarketData.price)
  }, [foundPool, runeMarketData.price])

  if (!foundPool) return null

  return (
    <Main headerComponent={headerComponent}>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Card>
            <CardHeader px={8} py={8}>
              <Flex gap={4} alignItems='center'>
                <PoolIcon assetIds={poolAssetIds} size='md' />
                <Heading as='h3'>{foundPool.name}</Heading>
              </Flex>
            </CardHeader>
            <CardBody gap={6} display='flex' flexDir='column' px={8} pb={8} pt={0}>
              <Text translation='pools.yourPosition' fontWeight='medium' />
              <Flex gap={12} flexWrap='wrap'>
                <Stack flex={1}>
                  <DynamicComponent
                    label='pools.liquidityValue'
                    component={liquidityValueComponent}
                    flex={responsiveFlex}
                    flexDirection='column-reverse'
                  />
                  <Card borderRadius='lg'>
                    <Stack px={4} py={2} spacing={4}>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[0]} />
                          <RawText>{asset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={foundUserData?.underlyingAssetAmountCryptoPrecision ?? '0'}
                          symbol={asset?.symbol ?? ''}
                        />
                      </Flex>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[1]} />
                          <RawText>{runeAsset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={foundUserData?.underlyingRuneAmountCryptoPrecision ?? '0'}
                          symbol={runeAsset?.symbol ?? ''}
                        />
                      </Flex>
                    </Stack>
                  </Card>
                </Stack>
                <Stack flex={1}>
                  <DynamicComponent
                    label='pools.unclaimedFees'
                    component={unclaimedFeesComponent}
                    flex={responsiveFlex}
                    flexDirection='column-reverse'
                  />
                  <Card borderRadius='lg'>
                    <Stack px={4} py={2} spacing={4}>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[0]} />
                          <RawText>{asset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={earnings?.assetEarnings ?? '0'}
                          symbol={asset?.symbol ?? ''}
                        />
                      </Flex>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[1]} />
                          <RawText>{runeAsset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={earnings?.runeEarnings ?? '0'}
                          symbol={runeAsset?.symbol ?? ''}
                        />
                      </Flex>
                    </Stack>
                  </Card>
                </Stack>
              </Flex>
            </CardBody>
            <CardFooter
              gap={6}
              display='flex'
              flexDir='column'
              px={8}
              py={8}
              borderTopWidth={1}
              borderColor='border.base'
            >
              <PoolInfo
                volume24h={volume24h ?? '0'}
                volume24hChange={swap24hChange?.volumeChangePercentage ?? 0}
                fee24hChange={swap24hChange?.feeChangePercentage ?? 0}
                fees24h={fees24h ?? '0'}
                allTimeVolume={allTimeVolume ?? '0'}
                apy={foundPool.poolAPY ?? '0'}
                tvl={tvl}
                assetIds={poolAssetIds}
              />
            </CardFooter>
          </Card>
          <Faq />
        </Stack>
        <Stack flex={1} maxWidth={maxWidth}>
          <Card>
            <Tabs onChange={setStepIndex} variant='unstyled' index={stepIndex}>
              <TabList px={2} py={4}>
                <Tab color='text.subtle' fontWeight='bold' _selected={tabSelected}>
                  {translate('pools.addLiquidity')}
                </Tab>
                <Tab color='text.subtle' fontWeight='bold' _selected={tabSelected}>
                  {translate('pools.removeLiquidity')}
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0} py={0}>
                  <p>Add</p>
                </TabPanel>
                <TabPanel px={0} py={0}>
                  <p>Remove</p>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}

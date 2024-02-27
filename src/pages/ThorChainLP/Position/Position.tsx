import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  IconButton,
  Stack,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory, useParams } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { DynamicComponent } from 'components/DynamicComponent'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  calculateEarnings,
  calculateTVL,
  get24hSwapChangePercentage,
  getFees,
  getVolume,
} from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddLiquidity } from '../components/AddLiquitity/AddLiquidity'
import { Faq } from '../components/Faq'
import { PoolIcon } from '../components/PoolIcon'
import { PoolInfo } from '../components/PoolInfo'
import { RemoveLiquidity } from '../components/RemoveLiquidity/RemoveLiquidity'
import { usePools } from '../queries/hooks/usePools'
import { useUserLpData } from '../queries/hooks/useUserLpData'
import { getPositionName } from '../utils'

type MatchParams = {
  poolAssetId: string
  accountId: AccountId
  opportunityId: string
}

const containerPadding = { base: 6, '2xl': 8 }
const maxWidth = { base: '100%', md: '450px' }
const responsiveFlex = { base: 'auto', lg: 1 }

const PoolHeader = () => {
  const history = useHistory()
  const translate = useTranslate()

  const handleBack = useCallback(() => history.push('/pools/positions'), [history])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  return (
    <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
      <Flex gap={4} alignItems='center'>
        <IconButton
          icon={backIcon}
          aria-label={translate('pools.positions')}
          onClick={handleBack}
        />
        <Heading>{translate('pools.positions')}</Heading>
      </Flex>
    </Container>
  )
}

type FormHeaderProps = {
  setStepIndex: (index: number) => void
  activeIndex: number
}

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

const FormHeaderTab: React.FC<FormHeaderTabProps> = ({ index, onClick, isActive, children }) => {
  const handleClick = useCallback(() => {
    onClick(index)
  }, [index, onClick])
  return (
    <Button
      onClick={handleClick}
      isActive={isActive}
      variant='unstyled'
      color='text.subtle'
      _active={activeStyle}
    >
      {children}
    </Button>
  )
}

const FormHeader: React.FC<FormHeaderProps> = ({ setStepIndex, activeIndex }) => {
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )
  return (
    <Flex px={6} py={4} gap={4}>
      <FormHeaderTab index={0} onClick={handleClick} isActive={activeIndex === 0}>
        {translate('pools.addLiquidity')}
      </FormHeaderTab>
      <FormHeaderTab index={1} onClick={handleClick} isActive={activeIndex === 1}>
        {translate('pools.removeLiquidity')}
      </FormHeaderTab>
    </Flex>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }

export const Position = () => {
  const params = useParams<MatchParams>()

  const [stepIndex, setStepIndex] = useState<number>(0)

  const { data: pools } = usePools()

  const opportunityId = useMemo(() => {
    return decodeURIComponent(params.opportunityId ?? '')
  }, [params.opportunityId])

  const poolAssetId = useMemo(() => params.poolAssetId, [params.poolAssetId])
  const accountId = useMemo(() => params.accountId, [params.accountId])

  const pool = useMemo(() => {
    return pools?.find(pool => pool.asset === poolAssetId)
  }, [poolAssetId, pools])

  const { data: userLpData } = useUserLpData({ assetId: pool?.assetId ?? '' })

  const position = useMemo(() => {
    if (!userLpData) return

    // TODO(gomes): when routed from the "Your positions" page, we will want to handle multi-account and narrow by AccountId
    // TODO(gomes): when supporting multi account for this, we will want to either handle default, highest balance account as default,
    // or, probably better from an architectural standpoint, have each account position be its separate row
    return userLpData?.find(data => data.opportunityId === opportunityId)
  }, [opportunityId, userLpData])

  const positionName = useMemo(() => {
    return getPositionName(pool?.name ?? '', opportunityId)
  }, [pool?.name, opportunityId])

  const poolAssetIds = useMemo(() => {
    if (!pool) return []

    return [pool.assetId, thorchainAssetId]
  }, [pool])

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const asset = useAppSelector(state => selectAssetById(state, pool?.assetId ?? ''))

  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, pool?.assetId ?? ''))

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
    if (!swapData24h) return undefined

    return getFees(runeMarketData.price, assetMarketData.price, swapData24h)
  }, [assetMarketData.price, runeMarketData.price, swapData24h])

  const { data: volume24h } = useQuery({
    ...reactQueries.midgard.swapsData(pool?.assetId, '24h'),
    select: data => getVolume(runeMarketData.price, data),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    staleTime: Infinity,
    enabled: !!pool?.assetId,
  })

  const swap24hChange = useMemo(() => {
    if (!pool || !swapData24h || !swapDataPrevious24h) return null

    return get24hSwapChangePercentage(
      runeMarketData.price,
      assetMarketData.price,
      swapData24h,
      swapDataPrevious24h,
    )
  }, [pool, swapData24h, swapDataPrevious24h, runeMarketData, assetMarketData])

  const { data: tvl24hChange } = useQuery({
    ...reactQueries.thorchainLp.tvl24hChange(pool?.assetId),
    enabled: !!pool?.assetId,
  })

  const { data: allTimeVolume } = useQuery({
    ...reactQueries.thorchainLp.allTimeVolume(pool?.assetId, runeMarketData.price),
    enabled: Boolean(!!pool?.assetId && !!bnOrZero(runeMarketData.price).gt(0)),
  })

  const { data: earnings } = useQuery({
    ...reactQueries.thorchainLp.earnings(position?.dateFirstAdded),
    enabled: Boolean(position),
    select: data => {
      if (!data || !position) return null

      const poolEarnings = data.meta.pools.find(pool => pool.pool === poolAssetId)
      if (!poolEarnings) return null

      return calculateEarnings(
        poolEarnings.assetLiquidityFees,
        poolEarnings.runeLiquidityFees,
        position.poolShare,
        runeMarketData.price,
        assetMarketData.price,
      )
    },
  })

  const tvl = useMemo(() => {
    if (!pool) return { tvl: '0', assetAmountCryptoPrecision: '0', runeAmountCryptoPrecision: '0' }

    return calculateTVL(pool.assetDepth, pool.runeDepth, runeMarketData.price)
  }, [pool, runeMarketData.price])

  const liquidityValueComponent = useMemo(
    () => <Amount.Fiat value={position?.totalValueFiatUserCurrency ?? '0'} fontSize='2xl' />,
    [position?.totalValueFiatUserCurrency],
  )

  const unclaimedFeesComponent = useMemo(
    () => <Amount.Fiat value={earnings?.totalEarningsFiatUserCurrency ?? '0'} fontSize='2xl' />,
    [earnings?.totalEarningsFiatUserCurrency],
  )

  const headerComponent = useMemo(() => <PoolHeader />, [])

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )

  if (!pool) return null

  return (
    <Main headerComponent={headerComponent}>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Card>
            <CardHeader px={8} py={8}>
              <Flex gap={4} alignItems='center'>
                <PoolIcon assetIds={poolAssetIds} size='md' />
                <Heading as='h3'>{positionName}</Heading>
              </Flex>
            </CardHeader>
            <CardBody gap={6} display='flex' flexDir='column' px={8} pb={8} pt={0}>
              <Text translation='pools.yourPosition' fontWeight='medium' />
              <Flex gap={12} flexWrap='wrap'>
                <Stack flex={1}>
                  <DynamicComponent
                    label='pools.balance'
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
                        whiteSpace='nowrap'
                        gap={2}
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[0]} />
                          <RawText>{asset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={position?.underlyingAssetAmountCryptoPrecision ?? '0'}
                          symbol={asset?.symbol ?? ''}
                        />
                      </Flex>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                        whiteSpace='nowrap'
                        gap={2}
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[1]} />
                          <RawText>{runeAsset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={position?.underlyingRuneAmountCryptoPrecision ?? '0'}
                          symbol={runeAsset?.symbol ?? ''}
                        />
                      </Flex>
                    </Stack>
                  </Card>
                </Stack>
                <Stack flex={1}>
                  <DynamicComponent
                    label='pools.earnings'
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
                        whiteSpace='nowrap'
                        gap={2}
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={poolAssetIds[0]} />
                          <RawText>{asset?.symbol ?? ''}</RawText>
                        </Flex>
                        <Amount.Crypto
                          value={earnings?.assetEarnings ?? '0'}
                          symbol={asset?.symbol ?? ''}
                          whiteSpace='nowrap'
                        />
                      </Flex>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                        whiteSpace='nowrap'
                        gap={2}
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
                volume24h={volume24h}
                volume24hChange={swap24hChange?.volumeChangePercentage}
                fee24hChange={swap24hChange?.feeChangePercentage}
                fees24h={fees24h}
                allTimeVolume={allTimeVolume}
                apy={pool.annualPercentageRate}
                tvl={tvl.tvl}
                tvl24hChange={tvl24hChange ?? 0}
                assetIds={poolAssetIds}
              />
            </CardFooter>
          </Card>
          <Faq />
        </Stack>
        <Stack flex={1} maxWidth={maxWidth}>
          <Card>
            <Tabs onChange={setStepIndex} variant='unstyled' index={stepIndex}>
              <TabPanels>
                <TabPanel px={0} py={0}>
                  <AddLiquidity headerComponent={TabHeader} opportunityId={opportunityId} />
                </TabPanel>
                {accountId && (
                  <TabPanel px={0} py={0}>
                    <RemoveLiquidity
                      headerComponent={TabHeader}
                      opportunityId={opportunityId}
                      accountId={accountId}
                    />
                  </TabPanel>
                )}
              </TabPanels>
            </Tabs>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}

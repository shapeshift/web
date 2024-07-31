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
  Skeleton,
  Stack,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { poolAssetIdToAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { useQuery } from '@tanstack/react-query'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory, useParams } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Display } from 'components/Display'
import { DynamicComponent } from 'components/DynamicComponent'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { calculateEarnings } from 'lib/utils/thorchain/lp'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddLiquidity } from '../components/AddLiquidity/AddLiquidity'
import { Faq } from '../components/Faq'
import { PoolIcon } from '../components/PoolIcon'
import { PoolInfo } from '../components/PoolInfo'
import { RemoveLiquidity } from '../components/RemoveLiquidity/RemoveLiquidity'
import { usePool } from '../queries/hooks/usePool'
import { useUserLpData } from '../queries/hooks/useUserLpData'
import { fromOpportunityId } from '../utils'

type MatchParams = {
  poolAssetId: string
  accountId: AccountId
  opportunityId: string
}

const containerPadding = { base: 6, '2xl': 8 }
const maxWidth = { base: '100%', md: '450px' }
const responsiveFlex = { base: 'auto', lg: 1 }

const PoolHeader: React.FC<{ name?: string }> = ({ name }) => {
  const history = useHistory()
  const translate = useTranslate()

  const handleBack = useCallback(() => history.push('/pools/positions'), [history])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{name}</PageHeader.Title>
          </PageHeader.Middle>
        </PageHeader>
      </Display.Mobile>
      <Display.Desktop>
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
      </Display.Desktop>
    </>
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

  const poolAssetId = useMemo(() => params.poolAssetId, [params.poolAssetId])
  const accountId = useMemo(() => params.accountId, [params.accountId])
  const assetId = useMemo(() => poolAssetIdToAssetId(poolAssetId), [poolAssetId])
  const opportunityId = useMemo(() => {
    return decodeURIComponent(params.opportunityId ?? '')
  }, [params.opportunityId])

  const { data: pool } = usePool(poolAssetId ?? '')
  const { data: userLpData, isLoading: isUserLpDataLoading } = useUserLpData({
    assetId: assetId ?? '',
  })

  const position = useMemo(() => {
    if (!userLpData) return

    // TODO(gomes): when routed from the "Your positions" page, we will want to handle multi-account and narrow by AccountId
    // TODO(gomes): when supporting multi account for this, we will want to either handle default, highest balance account as default,
    // or, probably better from an architectural standpoint, have each account position be its separate row
    return userLpData?.find(data => data.opportunityId === opportunityId)
  }, [opportunityId, userLpData])

  const poolAssetIds = useMemo(() => {
    if (!assetId) return []
    return [assetId, thorchainAssetId]
  }, [assetId])

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const { data: earnings, isLoading: isEarningsLoading } = useQuery({
    ...reactQueries.thorchainLp.earnings(position?.dateFirstAdded),
    enabled: Boolean(position),
    select: data => {
      if (!position) return null

      const poolEarnings = data?.meta.pools.find(pool => pool.pool === poolAssetId)
      if (!poolEarnings) return null

      return calculateEarnings(poolEarnings, position.poolShare, runeMarketData.price)
    },
  })

  const liquidityValueComponent = useMemo(
    () => <Amount.Fiat value={position?.totalValueFiatUserCurrency ?? '0'} fontSize='2xl' />,
    [position?.totalValueFiatUserCurrency],
  )

  const unclaimedFeesComponent = useMemo(
    () => <Amount.Fiat value={earnings?.totalEarningsFiat ?? '0'} fontSize='2xl' />,
    [earnings?.totalEarningsFiat],
  )

  const headerComponent = useMemo(
    () => <PoolHeader name={position?.name ?? pool?.name ?? ''} />,
    [pool?.name, position?.name],
  )

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )

  const poolTypeText = useMemo(() => {
    const { opportunityType } = fromOpportunityId(opportunityId)

    if (opportunityType === 'sym') return <Text translation='common.symmetric' />

    const positionAsset = opportunityType === AsymSide.Asset ? asset : runeAsset
    if (!positionAsset) return null
    return (
      <Text
        // eslint-disable-next-line react-memo/require-usememo
        translation={['common.asymmetric', { assetSymbol: positionAsset.symbol }]}
      />
    )
  }, [asset, opportunityId, runeAsset])

  const positionStatusTag = useMemo(() => {
    if (position?.status.incomplete) {
      return (
        <Tag size={'lg'} colorScheme='red'>
          <Text translation='common.incomplete' />
        </Tag>
      )
    }

    if (position?.status.isPending) {
      return (
        <Tag size={'lg'} colorScheme='yellow'>
          <Text translation='common.pending' />
        </Tag>
      )
    }
  }, [position])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Card>
            <CardHeader px={8} py={8}>
              <Flex gap={4} alignItems='center'>
                <PoolIcon assetIds={poolAssetIds} size='md' />
                <Skeleton isLoaded={Boolean(pool || position)}>
                  <Heading as='h3'>{position?.name ?? pool?.name ?? ''}</Heading>
                </Skeleton>
                <Tag size={'lg'}>{poolTypeText}</Tag>
                {positionStatusTag}
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
                        <Skeleton isLoaded={!isUserLpDataLoading}>
                          <Amount.Crypto
                            value={position?.underlyingAssetAmountCryptoPrecision ?? '0'}
                            symbol={asset?.symbol ?? ''}
                          />
                        </Skeleton>
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
                        <Skeleton isLoaded={!isUserLpDataLoading}>
                          <Amount.Crypto
                            value={position?.underlyingRuneAmountCryptoPrecision ?? '0'}
                            symbol={runeAsset?.symbol ?? ''}
                          />
                        </Skeleton>
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
                        <Skeleton isLoaded={!isEarningsLoading}>
                          <Amount.Crypto
                            value={earnings?.assetEarningsCryptoPrecision ?? '0'}
                            symbol={asset?.symbol ?? ''}
                            whiteSpace='nowrap'
                          />
                        </Skeleton>
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
                        <Skeleton isLoaded={!isEarningsLoading}>
                          <Amount.Crypto
                            value={earnings?.runeEarningsCryptoPrecision ?? '0'}
                            symbol={runeAsset?.symbol ?? ''}
                          />
                        </Skeleton>
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
                volume24h={pool?.volume24hFiat}
                volume24hChange={pool?.volume24hChange}
                fee24hChange={pool?.fees24hChange}
                fees24h={pool?.fees24hFiat}
                allTimeVolume={pool?.volumeTotalFiat}
                apy={pool?.annualPercentageRate}
                tvl={pool?.tvl24hFiat}
                tvl24hChange={pool?.tvl24hChange}
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
                      poolAssetId={poolAssetId}
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

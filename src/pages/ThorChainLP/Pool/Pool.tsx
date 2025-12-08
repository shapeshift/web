import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Alert,
  AlertDescription,
  AlertIcon,
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
import { SwapperName, thorPoolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import type { Property } from 'csstype'
import React, { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { generatePath, useNavigate, useParams } from 'react-router-dom'

import { Faq } from '../components/Faq'
import { PoolIcon } from '../components/PoolIcon'
import { PoolInfo } from '../components/PoolInfo'
import { usePool } from '../queries/hooks/usePool'
import { PairRates } from './components/PairRates'
import { PoolChart } from './components/PoolChart'

import { Display } from '@/components/Display'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import {
  useIsLpChainHalted,
  useIsLpDepositEnabled,
} from '@/lib/utils/thorchain/hooks/useIsThorchainLpDepositEnabled'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'

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
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleBack = useCallback(() => navigate('/pools'), [navigate])

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
        <Container px={containerPadding} pt={8} pb={4}>
          <Flex gap={4} alignItems='center'>
            <IconButton
              icon={backIcon}
              aria-label={translate('pools.pools')}
              onClick={handleBack}
            />
            <Flex gap={4} alignItems='center'>
              <PoolIcon assetIds={assetIds} size='sm' />
              <Heading as='h3'>{name}</Heading>
            </Flex>
          </Flex>
        </Container>
      </Display.Desktop>
    </>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }

export const Pool = () => {
  const navigate = useNavigate()
  const params = useParams<MatchParams>()
  const translate = useTranslate()

  const poolAssetId = useMemo(() => params.poolAssetId, [params.poolAssetId])

  if (!poolAssetId) throw new Error('poolAssetId is required')

  const assetId = useMemo(() => {
    return thorPoolAssetIdToAssetId(poolAssetId)
  }, [poolAssetId])

  if (!assetId) throw new Error(`assetId not found for poolAssetId ${poolAssetId}`)

  const { data: isLpChainHaltedForPool } = useIsLpChainHalted(assetId)
  const { data: isThorchainLpDepositEnabledForPool } = useIsLpDepositEnabled(assetId)

  const { data: pool } = usePool(poolAssetId)

  const runeTvlCryptoPrecision = useMemo(() => {
    if (!pool?.runeDepth) return
    return fromThorBaseUnit(pool.runeDepth).toFixed()
  }, [pool?.runeDepth])

  const assetTvlCryptoPrecision = useMemo(() => {
    if (!pool?.assetDepth) return
    return fromThorBaseUnit(pool.assetDepth).toFixed()
  }, [pool?.assetDepth])

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const poolAssetIds = useMemo(() => {
    if (!assetId) return []
    return [assetId, thorchainAssetId]
  }, [assetId])

  const handleAddLiquidityClick = useCallback(() => {
    navigate(generatePath('/pools/add/:poolAssetId', { poolAssetId }))
  }, [poolAssetId, navigate])

  const handleTradeClick = useCallback(() => {
    if (!assetId) return
    navigate(`${TradeRoutePaths.Input}/${assetId}`)
  }, [assetId, navigate])

  const headerComponent = useMemo(
    () => <PoolHeader assetIds={poolAssetIds} name={pool?.name ?? ''} />,
    [pool?.name, poolAssetIds],
  )

  const addIcon = useMemo(() => <FaPlus />, [])
  const swapIcon = useMemo(() => <SwapIcon />, [])

  if (!poolAssetId) return null

  return (
    <Main headerComponent={headerComponent} isSubPage>
      {isLpChainHaltedForPool === true ? (
        <Alert status='error' variant='subtle' mb={4}>
          <AlertIcon />
          <AlertDescription>{translate('common.disabled')}</AlertDescription>
        </Alert>
      ) : isThorchainLpDepositEnabledForPool === false && !isLpChainHaltedForPool ? (
        <Alert status='error' variant='subtle' mb={4}>
          <AlertIcon />
          <AlertDescription>{translate('pools.depositsDisabled')}</AlertDescription>
        </Alert>
      ) : null}
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
                label={translate('defi.modals.saversVaults.haltedDepositTitle')}
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
                  volume24h={pool?.volume24hFiat}
                  volume24hChange={pool?.volume24hChange}
                  fee24hChange={pool?.fees24hChange}
                  fees24h={pool?.fees24hFiat}
                  allTimeVolume={pool?.volumeTotalFiat}
                  apy={pool?.annualPercentageRate}
                  tvl={pool?.tvl24hFiat}
                  runeTvlCryptoPrecision={runeTvlCryptoPrecision}
                  assetTvlCryptoPrecision={assetTvlCryptoPrecision}
                  tvl24hChange={pool?.tvl24hChange}
                  assetIds={poolAssetIds}
                  direction='column'
                  display='full'
                  reverse
                />
              </CardFooter>
            </Card>
            <Card flex={1}>
              <CardBody>
                <PoolChart thorchainNotationAssetId={poolAssetId} />
              </CardBody>
            </Card>
          </Flex>
          <Faq />
        </Stack>
      </Flex>
    </Main>
  )
}

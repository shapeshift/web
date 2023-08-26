import {
  Alert,
  AlertDescription,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Stat,
  StatArrow,
  StatGroup,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { TimeControls } from 'components/Graph/TimeControls'
import { IconCircle } from 'components/IconCircle'
import { StakingUpArrowIcon } from 'components/Icons/StakingUpArrow'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { RawText, Text } from 'components/Text'
import { useIsBalanceChartDataUnavailable } from 'hooks/useBalanceChartData/utils'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useTimeframeChange } from 'hooks/useTimeframeChange/useTimeframeChange'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import {
  selectAssetById,
  selectChartTimeframe,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectMarketDataById,
  selectUserCurrencyBalanceIncludingStakingByFilter,
  selectUserStakingOpportunitiesAggregatedByFilterCryptoBaseUnit,
  selectUserStakingOpportunitiesAggregatedByFilterUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { HelperTooltip } from '../HelperTooltip/HelperTooltip'

enum View {
  Price = 'price',
  Balance = 'balance',
}

type AssetChartProps = {
  accountId?: AccountId
  assetId: AssetId
  isLoaded: boolean
}

export const AssetChart = ({ accountId, assetId, isLoaded }: AssetChartProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const [percentChange, setPercentChange] = useState(0)
  const alertIconColor = useColorModeValue('blue.500', 'blue.200')
  const userChartTimeframe = useAppSelector(selectChartTimeframe)
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>(userChartTimeframe)
  const handleTimeframeChange = useTimeframeChange(setTimeframe)
  const assetIds = useMemo(() => [assetId].filter(isSome), [assetId])
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const { price } = marketData || {}
  const assetPrice = toFiat(price) ?? 0
  const isBalanceChartDataUnavailable = useIsBalanceChartDataUnavailable(assetIds)
  const defaultView = accountId && !isBalanceChartDataUnavailable ? View.Balance : View.Price
  const [view, setView] = useState(defaultView)

  const translate = useTranslate()
  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])

  const userCurrencyBalance = useAppSelector(s =>
    selectUserCurrencyBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const stakingBalanceCryptoBaseUnit = useAppSelector(state =>
    selectUserStakingOpportunitiesAggregatedByFilterCryptoBaseUnit(state, opportunitiesFilter),
  )

  const stakingBalanceUserCurrency = useAppSelector(state =>
    selectUserStakingOpportunitiesAggregatedByFilterUserCurrency(state, opportunitiesFilter),
  )

  useEffect(() => {
    if (isBalanceChartDataUnavailable) return
    if (bnOrZero(userCurrencyBalance).eq(0)) return
    setView(View.Balance)
  }, [userCurrencyBalance, isBalanceChartDataUnavailable])

  return (
    <Card variant='outline'>
      <CardHeader>
        <Flex
          justifyContent={{ base: 'center', md: 'space-between' }}
          width='full'
          flexDir={{ base: 'column', md: 'row' }}
        >
          <Skeleton isLoaded={isLoaded} textAlign='center'>
            <ButtonGroup size='sm' colorScheme='blue' variant='ghost'>
              {!isBalanceChartDataUnavailable && (
                <Button isActive={view === View.Balance} onClick={() => setView(View.Balance)}>
                  <Text translation='assets.assetDetails.assetHeader.balance' />
                </Button>
              )}
              <Button isActive={view === View.Price} onClick={() => setView(View.Price)}>
                <Text translation='assets.assetDetails.assetHeader.price' />
              </Button>
            </ButtonGroup>
          </Skeleton>

          <Skeleton isLoaded={isLoaded} display={{ base: 'none', md: 'block' }}>
            <TimeControls onChange={handleTimeframeChange} defaultTime={timeframe} />
          </Skeleton>
        </Flex>
        <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
          <Heading fontSize='4xl' lineHeight={1} mb={2}>
            <Skeleton isLoaded={isLoaded}>
              <NumberFormat
                value={view === View.Price ? assetPrice : toFiat(userCurrencyBalance)}
                displayType={'text'}
                thousandSeparator={true}
                isNumericString={true}
              />
            </Skeleton>
          </Heading>
          <StatGroup>
            <Stat size='sm' display='flex' flex='initial' mr={2}>
              <Skeleton isLoaded={isLoaded}>
                <StatNumber
                  display='flex'
                  alignItems='center'
                  color={percentChange > 0 ? 'green.500' : 'red.500'}
                >
                  <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
                  {isFinite(percentChange) && <RawText>{percentChange}%</RawText>}
                </StatNumber>
              </Skeleton>
            </Stat>
            {view === View.Balance && (
              <Stat size='sm' color='text.subtle'>
                <Skeleton isLoaded={isLoaded}>
                  <StatNumber>{`${cryptoHumanBalance} ${asset?.symbol ?? ''}`}</StatNumber>
                </Skeleton>
              </Stat>
            )}
          </StatGroup>
          {bnOrZero(stakingBalanceUserCurrency).gt(0) && view === View.Balance && (
            <Flex mt={4}>
              <Alert
                as={Stack}
                py={2}
                direction='row'
                colorScheme='blue'
                status='info'
                variant='subtle'
                borderRadius='xl'
              >
                <IconCircle color='inherit' boxSize='24px'>
                  <StakingUpArrowIcon color={alertIconColor} />
                </IconCircle>

                <AlertDescription maxWidth='sm'>
                  <Amount.Crypto
                    value={stakingBalanceCryptoBaseUnit
                      .div(bn(10).pow(asset?.precision ?? 1))
                      .toFixed()}
                    symbol={asset?.symbol ?? ''}
                    suffix={translate('defi.staked')}
                  />
                </AlertDescription>

                <HelperTooltip label={translate('dashboard.portfolio.stakedInfo')} />
              </Alert>
            </Flex>
          )}
        </Box>
      </CardHeader>
      {view === View.Balance && marketData ? (
        <Box>
          <BalanceChart
            accountId={accountId}
            assetId={assetId}
            timeframe={timeframe}
            percentChange={percentChange}
            setPercentChange={setPercentChange}
            isRainbowChart={false}
          />
        </Box>
      ) : (
        <Box>
          <PriceChart
            assetId={assetId}
            timeframe={timeframe}
            percentChange={percentChange}
            setPercentChange={setPercentChange}
          />
        </Box>
      )}
      <Skeleton isLoaded={isLoaded} display={{ base: 'block', md: 'none' }}>
        <TimeControls
          onChange={handleTimeframeChange}
          defaultTime={timeframe}
          buttonGroupProps={{
            display: 'flex',
            width: 'full',
            justifyContent: 'space-between',
            px: 6,
            py: 4,
          }}
        />
      </Skeleton>
    </Card>
  )
}

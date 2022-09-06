import {
  Alert,
  AlertDescription,
  Box,
  Button,
  ButtonGroup,
  Flex,
  Skeleton,
  Stack,
  Stat,
  StatArrow,
  StatGroup,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { useEffect, useMemo, useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { IconCircle } from 'components/IconCircle'
import { StakingUpArrowIcon } from 'components/Icons/StakingUpArrow'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useEarnBalances } from 'pages/Defi/hooks/useEarnBalances'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectTotalCryptoBalanceWithDelegations,
  selectTotalFiatBalanceWithDelegations,
} from 'state/slices/portfolioSlice/selectors'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { HelperTooltip } from '../HelperTooltip/HelperTooltip'

enum View {
  Price = 'price',
  Balance = 'balance',
}

type AssetChartProps = {
  accountId?: AccountSpecifier
  assetId: AssetId
  isLoaded: boolean
}

export const AssetChart = ({ accountId, assetId, isLoaded }: AssetChartProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const [percentChange, setPercentChange] = useState(0)
  const alertIconColor = useColorModeValue('blue.500', 'blue.200')
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>(DEFAULT_HISTORY_TIMEFRAME)
  const assetIds = useMemo(() => [assetId].filter(Boolean), [assetId])
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const { price } = marketData || {}
  const assetPrice = toFiat(price) ?? 0
  const [view, setView] = useState(accountId ? View.Balance : View.Price)
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, asset?.chainId),
  )
  const filter = useMemo(
    () => ({ assetId, accountId, accountSpecifier }),
    [assetId, accountId, accountSpecifier],
  )
  const translate = useTranslate()

  const fiatBalanceWithDelegations = useAppSelector(state =>
    selectTotalFiatBalanceWithDelegations(state, filter),
  )

  const cryptoBalanceWithDelegations = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, filter),
  )

  const earnBalances = useEarnBalances()
  const delegationBalance = useMemo(() => {
    const assetEarnBalance = earnBalances.opportunities.find(balance => balance.assetId === assetId)
    return assetEarnBalance?.cryptoAmount ?? '0'
  }, [assetId, earnBalances.opportunities])

  useEffect(() => {
    if (bnOrZero(fiatBalanceWithDelegations).gt(0)) {
      setView(View.Balance)
    }
  }, [fiatBalanceWithDelegations])

  return (
    <Card>
      <Card.Header>
        <Flex
          justifyContent={{ base: 'center', md: 'space-between' }}
          width='full'
          flexDir={{ base: 'column', md: 'row' }}
        >
          <Skeleton isLoaded={isLoaded} textAlign='center'>
            <ButtonGroup size='sm' colorScheme='blue' variant='ghost'>
              <Button isActive={view === View.Balance} onClick={() => setView(View.Balance)}>
                <Text translation='assets.assetDetails.assetHeader.balance' />
              </Button>
              <Button isActive={view === View.Price} onClick={() => setView(View.Price)}>
                <Text translation='assets.assetDetails.assetHeader.price' />
              </Button>
            </ButtonGroup>
          </Skeleton>

          <Skeleton isLoaded={isLoaded} display={{ base: 'none', md: 'block' }}>
            <TimeControls onChange={setTimeframe} defaultTime={timeframe} />
          </Skeleton>
        </Flex>
        <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
          <Card.Heading fontSize='4xl' lineHeight={1} mb={2}>
            <Skeleton isLoaded={isLoaded}>
              <NumberFormat
                value={view === View.Price ? assetPrice : toFiat(fiatBalanceWithDelegations)}
                displayType={'text'}
                thousandSeparator={true}
                isNumericString={true}
              />
            </Skeleton>
          </Card.Heading>
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
              <Stat size='sm' color='gray.500'>
                <Skeleton isLoaded={isLoaded}>
                  <StatNumber>{`${cryptoBalanceWithDelegations} ${asset.symbol}`}</StatNumber>
                </Skeleton>
              </Stat>
            )}
          </StatGroup>
          {bnOrZero(delegationBalance).gt(0) && view === View.Balance && (
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
                    value={delegationBalance}
                    symbol={asset.symbol}
                    suffix={translate('defi.staked')}
                  />
                </AlertDescription>

                <HelperTooltip label={translate('dashboard.portfolio.stakedInfo')} />
              </Alert>
            </Flex>
          )}
        </Box>
      </Card.Header>
      {view === View.Balance && marketData ? (
        <Box>
          <BalanceChart
            accountId={accountId}
            assetIds={assetIds}
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
          onChange={setTimeframe}
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

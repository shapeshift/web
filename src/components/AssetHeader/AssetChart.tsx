import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Skeleton,
  Stat,
  StatArrow,
  StatGroup,
  StatNumber
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import NumberFormat from 'react-number-format'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

enum View {
  Price = 'price',
  Balance = 'balance'
}

type AssetChartProps = {
  accountId?: AccountSpecifier
  assetId: CAIP19
  isLoaded: boolean
}
export const AssetChart = ({ accountId, assetId, isLoaded }: AssetChartProps) => {
  const {
    number: { toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [percentChange, setPercentChange] = useState(0)
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.DAY)
  const assetIds = useMemo(() => [assetId].filter(Boolean), [assetId])
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const { price } = marketData || {}
  const assetPrice = toFiat(price) ?? 0
  const [view, setView] = useState(accountId ? View.Balance : View.Price)
  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, filter)
  )
  const totalBalance = toFiat(
    useAppSelector(state => selectPortfolioFiatBalanceByFilter(state, filter))
  )
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
                value={view === View.Price ? assetPrice : totalBalance}
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
                  <StatNumber>{`${cryptoBalance} ${asset.symbol}`}</StatNumber>
                </Skeleton>
              </Stat>
            )}
          </StatGroup>
        </Box>
      </Card.Header>
      {view === View.Balance ? (
        <Box>
          <BalanceChart
            accountId={accountId}
            assetIds={assetIds}
            timeframe={timeframe}
            percentChange={percentChange}
            setPercentChange={setPercentChange}
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
            py: 4
          }}
        />
      </Skeleton>
    </Card>
  )
}

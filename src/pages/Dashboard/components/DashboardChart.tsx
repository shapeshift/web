import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Card,
  CardHeader,
  Flex,
  Heading,
  Skeleton,
  Stat,
  StatArrow,
  StatNumber,
  Switch,
} from '@chakra-ui/react'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import type { Property } from 'csstype'
import { useCallback, useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { TimeControls } from 'components/Graph/TimeControls'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { Text } from 'components/Text'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectChartTimeframe,
  selectIsPortfolioLoading,
  selectPortfolioAssetIds,
  selectPortfolioTotalUserCurrencyBalance,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ErroredTxHistoryAccounts } from './ErroredTxHistoryAccounts'

const justifyContentMdSpaceBetween = { base: 'center', md: 'space-between' }
const textAlignMdInherit: ResponsiveValue<Property.TextAlign> = { base: 'center', md: 'inherit' }
const flexDirMdRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const displayMdBlock = { base: 'none', md: 'block' }
const justifyContentMdFlexStart = { base: 'center', md: 'flex-start' }
const displayMdNone = { base: 'block', md: 'none' }
const displayMdFlex = { base: 'none', md: 'flex' }
const timeControlsButtonGroupProps = {
  display: 'flex',
  width: 'full',
  justifyContent: 'space-between',
  px: 6,
  py: 4,
}

export const DashboardChart = () => {
  const userChartTimeframe = useAppSelector(selectChartTimeframe)
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>(userChartTimeframe)
  const dispatch = useAppDispatch()
  const handleTimeframeChange = useCallback(
    (newTimeframe: HistoryTimeframe) => {
      // Usually used to set the component state to the new timeframe
      setTimeframe(newTimeframe)
      // Save the new timeframe in the user preferences
      dispatch(preferences.actions.setChartTimeframe({ timeframe: newTimeframe }))
    },
    [dispatch],
  )

  const [percentChange, setPercentChange] = useState(0)

  const assetIds = useAppSelector(selectPortfolioAssetIds)

  const portfolioTotalUserCurrencyBalance = useAppSelector(selectPortfolioTotalUserCurrencyBalance)
  const loading = useAppSelector(selectIsPortfolioLoading)
  const isLoaded = !loading

  const [isRainbowChart, setIsRainbowChart] = useState(false)
  const toggleChartType = useCallback(() => setIsRainbowChart(!isRainbowChart), [isRainbowChart])
  return (
    <Card variant='dashboard'>
      <CardHeader
        display={displayMdFlex}
        justifyContent={justifyContentMdSpaceBetween}
        alignItems='center'
        textAlign={textAlignMdInherit}
        width='full'
        flexDir={flexDirMdRow}
        borderBottomWidth={0}
      >
        <Button size='sm' flexDirection='row' onClick={toggleChartType} variant='outline'>
          <Text translation='dashboard.portfolio.totalChart' />
          <Switch isChecked={isRainbowChart} pointerEvents='none' mx={2} size='sm' />
          <Text translation='dashboard.portfolio.rainbowChart' />
        </Button>
        <Skeleton isLoaded={isLoaded} display={displayMdBlock}>
          <TimeControls defaultTime={timeframe} onChange={handleTimeframeChange} />
        </Skeleton>
      </CardHeader>
      <Flex flexDir='column' justifyContent='center' alignItems='center' display={displayMdFlex}>
        <Heading as='div' color='text.subtle'>
          <Skeleton isLoaded={isLoaded}>
            <Text translation='defi.walletBalance' />
          </Skeleton>
        </Heading>
        <Flex>
          <Heading as='h2' fontSize='4xl' lineHeight='1' mr={2}>
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat value={portfolioTotalUserCurrencyBalance} />
            </Skeleton>
          </Heading>
          <ErroredTxHistoryAccounts />
        </Flex>
        {isFinite(percentChange) && (
          <Skeleton mt={2} isLoaded={!!percentChange}>
            <Stat display='flex' justifyContent={justifyContentMdFlexStart}>
              <StatNumber fontSize='md' display='flex' alignItems='center'>
                <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
                <Amount.Percent value={percentChange * 0.01} />
              </StatNumber>
            </Stat>
          </Skeleton>
        )}
      </Flex>
      <BalanceChart
        timeframe={timeframe}
        percentChange={percentChange}
        setPercentChange={setPercentChange}
        isRainbowChart={isRainbowChart}
      />
      <Skeleton isLoaded={isLoaded} display={displayMdNone}>
        <TimeControls
          onChange={handleTimeframeChange}
          defaultTime={timeframe}
          buttonGroupProps={timeControlsButtonGroupProps}
        />
      </Skeleton>
      <MaybeChartUnavailable assetIds={assetIds} />
    </Card>
  )
}

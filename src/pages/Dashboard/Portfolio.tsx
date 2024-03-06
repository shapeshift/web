import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Stat,
  StatArrow,
  StatNumber,
  Switch,
} from '@chakra-ui/react'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import type { Property } from 'csstype'
import { memo, useCallback, useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { TimeControls } from 'components/Graph/TimeControls'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { Text } from 'components/Text'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectChartTimeframe,
  selectPortfolioAssetIds,
  selectPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AccountTable } from './components/AccountList/AccountTable'
import { PortfolioBreakdown } from './PortfolioBreakdown'

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
const cardBodyPx = { base: 4, md: 2 }
const accountHeaderPaddingBottom = { base: 0, md: 4 }
const accountHeaderPaddingTop = { base: 6, md: 4 }
const stackSpacing = { base: 0, md: 6 }

export const Portfolio = memo(() => {
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

  const portfolioTotalUserCurrencyBalance = useAppSelector(
    selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  )
  const loading = useAppSelector(selectPortfolioLoading)
  const isLoaded = !loading

  const [isRainbowChart, setIsRainbowChart] = useState(false)
  const toggleChartType = useCallback(() => setIsRainbowChart(!isRainbowChart), [isRainbowChart])

  return (
    <Stack spacing={stackSpacing} width='full'>
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
          <Heading as='h2' fontSize='4xl' lineHeight='1'>
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat value={portfolioTotalUserCurrencyBalance} />
            </Skeleton>
          </Heading>
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
      </Card>
      <MaybeChartUnavailable assetIds={assetIds} />
      <PortfolioBreakdown />
      <Card variant='dashboard'>
        <CardHeader pb={accountHeaderPaddingBottom} pt={accountHeaderPaddingTop}>
          <Heading as='h6'>
            <Text translation='dashboard.portfolio.myAssets' />
          </Heading>
        </CardHeader>
        <CardBody px={cardBodyPx} pt={0} pb={0}>
          <AccountTable />
        </CardBody>
      </Card>
    </Stack>
  )
})

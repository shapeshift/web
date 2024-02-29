import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Card, CardHeader, Flex, Heading, Skeleton, useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { TimeControls } from 'components/Graph/TimeControls'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectChartTimeframe,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './AssetActions'

type AssetChartProps = {
  accountId?: AccountId
  assetId: AssetId
  isLoaded: boolean
}

const borderWidth = { base: 0, md: 0 }
const displayBaseBlockMdNone = { base: 'block', md: 'none' }
const displayBaseNoneMdBlock = { base: 'none', md: 'block' }
const displayBaseFlexMdNone = { base: 'flex', md: 'none' }
const timeControlsButtonGroupProps = {
  display: 'flex',
  width: 'full',
  justifyContent: 'space-between',
  px: 6,
  py: 4,
}
const justifyContentMdSpaceBetween = { base: 'center', md: 'space-between' }
const flexDirMdRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const useMediaQueryOptions = { ssr: false }

export const AssetChart = ({ accountId, assetId, isLoaded }: AssetChartProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, useMediaQueryOptions)
  const [percentChange, setPercentChange] = useState(0)
  const [fiatChange, setFiatChange] = useState(0)
  const userChartTimeframe = useAppSelector(selectChartTimeframe)
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>(userChartTimeframe)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const { price } = marketData || {}
  const assetPrice = toFiat(price) ?? 0

  const handleTimeframeChange = useCallback(
    (newTimeframe: HistoryTimeframe) => {
      // Usually used to set the component state to the new timeframe
      setTimeframe(newTimeframe)
      // Save the new timeframe in the user preferences
      dispatch(preferences.actions.setChartTimeframe({ timeframe: newTimeframe }))
    },
    [dispatch],
  )

  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])

  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )

  return (
    <Card variant='dashboard'>
      <CardHeader
        display='flex'
        justifyContent='space-between'
        width='full'
        borderWidth={borderWidth}
        pb={0}
      >
        <Box alignItems='flex-start' display='flex' flexDir='column'>
          <RawText color='text.subtle'>
            {asset?.symbol} {translate('assets.assetDetails.assetHeader.price')}
          </RawText>
          <Heading fontSize='4xl' lineHeight={1} mb={2}>
            <Skeleton isLoaded={isLoaded}>
              <NumberFormat
                value={assetPrice}
                displayType={'text'}
                thousandSeparator={true}
                isNumericString={true}
              />
            </Skeleton>
          </Heading>
          <Skeleton isLoaded={isLoaded}>
            <Flex
              fontSize='sm'
              fontWeight='medium'
              color={percentChange > 0 ? 'green.500' : 'red.500'}
              gap={1}
            >
              {isFinite(fiatChange) && <Amount.Fiat value={fiatChange} />}
              {isFinite(percentChange) && <RawText>({percentChange}%)</RawText>}
            </Flex>
          </Skeleton>
        </Box>
        <Flex justifyContent={justifyContentMdSpaceBetween} flexDir={flexDirMdRow}>
          <Skeleton isLoaded={isLoaded} display={displayBaseNoneMdBlock}>
            <TimeControls onChange={handleTimeframeChange} defaultTime={timeframe} />
          </Skeleton>
        </Flex>
      </CardHeader>
      <PriceChart
        assetId={assetId}
        timeframe={timeframe}
        percentChange={percentChange}
        setPercentChange={setPercentChange}
        setFiatChange={setFiatChange}
        chartHeight={isLargerThanMd ? '350px' : '200px'}
        hideAxis={true}
      />
      <Skeleton isLoaded={isLoaded} display={displayBaseBlockMdNone}>
        <TimeControls
          onChange={handleTimeframeChange}
          defaultTime={timeframe}
          buttonGroupProps={timeControlsButtonGroupProps}
        />
      </Skeleton>
      <Flex display={displayBaseFlexMdNone} my={4}>
        <AssetActions
          assetId={assetId}
          accountId={accountId}
          cryptoBalance={cryptoHumanBalance}
          isMobile
        />
      </Flex>
    </Card>
  )
}

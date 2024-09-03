import { CardHeader, Flex, Heading, useMediaQuery } from '@chakra-ui/react'
import { DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL, swappers } from '@shapeshiftoss/swapper'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import { selectActiveQuote, selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { TradeInputTab } from '../../../types'
import { SlippagePopover } from '../../SlippagePopover'
import { CountdownSpinner } from './TradeQuotes/components/CountdownSpinner'

type TradeInputHeaderRightComponentProps = {
  isCompact: boolean | undefined
  isLoading: boolean
}

type FakeTabHeaderProps = {
  initialTab: TradeInputTab
  isCompact: boolean | undefined
  isLoading: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

const TradeInputHeaderRightComponent = ({
  isCompact,
  isLoading,
}: TradeInputHeaderRightComponentProps) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)

  const pollingInterval = useMemo(() => {
    if (!activeSwapperName) return DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL
    return swappers[activeSwapperName]?.pollingInterval ?? DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL
  }, [activeSwapperName])

  const isRefetching = useMemo(
    () => Boolean(activeSwapperName && isTradeQuoteApiQueryPending[activeSwapperName] === true),
    [activeSwapperName, isTradeQuoteApiQueryPending],
  )

  return (
    <>
      {activeQuote && (isCompact || isSmallerThanXl) && (
        <CountdownSpinner isLoading={isLoading || isRefetching} initialTimeMs={pollingInterval} />
      )}
      <SlippagePopover />
    </>
  )
}

export const TradeInputHeader = ({
  initialTab,
  isCompact,
  isLoading,
  onChangeTab,
}: FakeTabHeaderProps) => {
  const translate = useTranslate()
  const [selectedTab, setSelectedTab] = useState<TradeInputTab>(initialTab)

  const enableBridgeClaims = useFeatureFlag('ArbitrumBridgeClaims')

  const handleClickTrade = useCallback(() => {
    setSelectedTab(TradeInputTab.Trade)
    onChangeTab(TradeInputTab.Trade)
  }, [onChangeTab])

  const handleClickClaim = useCallback(() => {
    setSelectedTab(TradeInputTab.Claim)
    onChangeTab(TradeInputTab.Claim)
  }, [onChangeTab])

  const rightComponent = useMemo(() => {
    return (() => {
      switch (selectedTab) {
        case TradeInputTab.Trade:
          return <TradeInputHeaderRightComponent isLoading={isLoading} isCompact={isCompact} />
        case TradeInputTab.Claim:
          return null
        default:
          assertUnreachable(selectedTab)
      }
    })()
  }, [selectedTab, isLoading, isCompact])

  return (
    <CardHeader px={6}>
      <Flex alignItems='center' justifyContent='space-between'>
        <Flex gap={4}>
          <Heading
            as='h5'
            fontSize='md'
            color={selectedTab !== TradeInputTab.Trade ? 'text.subtle' : undefined}
            onClick={handleClickTrade}
            cursor={selectedTab !== TradeInputTab.Trade ? 'pointer' : undefined}
          >
            {translate('navBar.trade')}
          </Heading>
          {enableBridgeClaims && (
            <Heading
              as='h5'
              fontSize='md'
              color={selectedTab !== TradeInputTab.Claim ? 'text.subtle' : undefined}
              onClick={handleClickClaim}
              cursor={selectedTab !== TradeInputTab.Claim ? 'pointer' : undefined}
            >
              {translate('bridge.claim')}
            </Heading>
          )}
        </Flex>
        <Flex gap={2} alignItems='center' height={6}>
          {rightComponent}
        </Flex>
      </Flex>
    </CardHeader>
  )
}

import { CardHeader, Flex, Heading, IconButton, useMediaQuery } from '@chakra-ui/react'
import { DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL, swappers } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import { selectActiveQuote, selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { SlippagePopover } from '../../SlippagePopover'
import { CountdownSpinner } from './TradeQuotes/components/CountdownSpinner'

type TradeInputHeaderRightComponentProps = {
  isCompact: boolean | undefined
  isLoading: boolean
}

type FakeTabHeaderProps = {
  isCompact: boolean | undefined
  isLoading: boolean
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

const arrowRightIcon = <FaArrowRight />

export const TradeInputHeader = ({ isCompact, isLoading }: FakeTabHeaderProps) => {
  const history = useHistory()
  const translate = useTranslate()
  const enableBridgeClaims = useFeatureFlag('ArbitrumBridgeClaims')
  const claimsAvailable = true

  const handleClickClaim = useCallback(() => {
    history.push({ pathname: TradeRoutePaths.Claim })
  }, [history])

  return (
    <>
      {enableBridgeClaims && claimsAvailable && (
        <CardHeader px={6} bg='background.success' borderTopRadius='2xl'>
          <Flex alignItems='center' justifyContent='space-between'>
            <Flex gap={4}>
              <Heading as='h5' fontSize='sm' color='green.500'>
                {translate('bridge.claimsAvailable')}
              </Heading>
            </Flex>
            <Flex gap={2} alignItems='center' height={6}>
              <IconButton
                onClick={handleClickClaim}
                size='sm'
                position='relative'
                variant='ghost'
                color='green.500'
                zIndex={1}
                aria-label={translate('bridge.claim')}
                icon={arrowRightIcon}
              />
            </Flex>
          </Flex>
        </CardHeader>
      )}
      <CardHeader px={6}>
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex gap={4}>
            <Heading as='h5' fontSize='md' color='text.subtle'>
              {translate('navBar.trade')}
            </Heading>
          </Flex>
          <Flex gap={2} alignItems='center' height={6}>
            <TradeInputHeaderRightComponent isLoading={isLoading} isCompact={isCompact} />
          </Flex>
        </Flex>
      </CardHeader>
    </>
  )
}

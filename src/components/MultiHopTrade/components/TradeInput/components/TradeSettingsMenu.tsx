import { useMediaQuery } from '@chakra-ui/react'
import { DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL, swappers } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import { selectActiveQuote, selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { SlippagePopover } from '../../SlippagePopover'
import { CountdownSpinner } from './TradeQuotes/components/CountdownSpinner'

type TradeSettingsMenuProps = {
  isCompact: boolean | undefined
  isLoading: boolean
}

export const TradeSettingsMenu = ({ isCompact, isLoading }: TradeSettingsMenuProps) => {
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

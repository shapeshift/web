import { useMediaQuery } from '@chakra-ui/react'
import { DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL } from '@shapeshiftoss/swapper'
import { useCallback } from 'react'

import { SettingsPopover } from '../../SettingsPopover'
import { CountdownSpinner } from './TradeQuotes/components/CountdownSpinner'

import { selectIsTradeQuoteApiQueryPending } from '@/state/apis/swapper/selectors'
import { swapperApi } from '@/state/apis/swapper/swapperApi'
import { selectActiveQuote } from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type TradeSettingsMenuProps = {
  isCompact: boolean | undefined
}

export const TradeSettingsMenu = ({ isCompact }: TradeSettingsMenuProps) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const activeQuote = useAppSelector(selectActiveQuote)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)

  const dispatch = useAppDispatch()

  const showRefreshSpinner = Object.values(isTradeQuoteApiQueryPending).some(isPending => isPending)
  const handleRefreshQuotes = useCallback((): void => {
    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))
  }, [dispatch])

  return (
    <>
      {activeQuote && (isCompact || isSmallerThanXl) && (
        <CountdownSpinner
          isLoading={showRefreshSpinner}
          initialTimeMs={DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL}
          onComplete={handleRefreshQuotes}
        />
      )}
      <SettingsPopover />
    </>
  )
}

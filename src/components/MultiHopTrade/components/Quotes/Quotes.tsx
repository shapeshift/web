import { CardHeader, Heading } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { selectSortedTradeQuotes } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TradeQuotes } from '../TradeInput/components/TradeQuotes/TradeQuotes'
import { WithBackButton } from '../WithBackButton'

export const Quotes = () => {
  const sortedQuotes = useAppSelector(selectSortedTradeQuotes)
  const { isSwapperFetching, isQuoteRequestIncomplete } = useGetTradeQuotes()
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(TradeRoutePaths.Input)
  }, [history])

  return (
    <SlideTransition>
      <CardHeader>
        <WithBackButton handleBack={handleBack}>
          <Heading as='h5' textAlign='center'>
            Available Quotes
          </Heading>
        </WithBackButton>
      </CardHeader>
      <TradeQuotes
        sortedQuotes={sortedQuotes}
        isLoading={isQuoteRequestIncomplete}
        isSwapperFetching={isSwapperFetching}
      />
    </SlideTransition>
  )
}

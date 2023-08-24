import { Flex } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import type { ApiQuote } from 'state/apis/swappers'
import { selectActiveQuoteIndex } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  sortedQuotes: ApiQuote[]
  isLoading: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(({ sortedQuotes, isLoading }) => {
  const activeQuoteIndex = useAppSelector(selectActiveQuoteIndex)

  const bestQuoteData = sortedQuotes[0]

  const quotes = useMemo(
    () =>
      sortedQuotes.map((quoteData, i) => {
        const { index } = quoteData

        // TODO(woodenfurniture): use quote ID when we want to support multiple quotes per swapper
        const isActive = activeQuoteIndex === index
        const bestQuoteSteps = bestQuoteData?.quote?.steps
        const lastStep = bestQuoteSteps?.[bestQuoteSteps.length - 1]

        return (
          <TradeQuote
            isActive={isActive}
            isLoading={isLoading}
            isBest={i === 0}
            key={index}
            quoteData={quoteData}
            bestBuyAmountBeforeFeesCryptoBaseUnit={
              lastStep?.buyAmountBeforeFeesCryptoBaseUnit ?? '0'
            }
          />
        )
      }),
    [activeQuoteIndex, bestQuoteData?.quote?.steps, isLoading, sortedQuotes],
  )

  return (
    <Flex flexDir='column' gap={2} width='full' px={0} py={2}>
      {quotes}
    </Flex>
  )
})

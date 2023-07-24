import { Collapse, Flex } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import type { ApiQuote } from 'state/apis/swappers'
import { selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  sortedQuotes: ApiQuote[]
}

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(({ isOpen, sortedQuotes }) => {
  const activeSwapperName = useAppSelector(selectActiveSwapperName)

  const bestQuoteData = sortedQuotes[0]

  const quotes = useMemo(
    () =>
      sortedQuotes.map((quoteData, i) => {
        const { quote, swapperName } = quoteData

        // TODO(woodenfurniture): we may want to display per-swapper errors here
        if (!quote) return null

        // TODO(woodenfurniture): use quote ID when we want to support multiple quotes per swapper
        const isActive = activeSwapperName === swapperName

        return (
          <TradeQuote
            isActive={isActive}
            isBest={i === 0}
            key={swapperName}
            quoteData={quoteData}
            bestInputOutputRatio={bestQuoteData.inputOutputRatio}
          />
        )
      }),
    [activeSwapperName, bestQuoteData, sortedQuotes],
  )

  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        {quotes}
      </Flex>
    </Collapse>
  )
})

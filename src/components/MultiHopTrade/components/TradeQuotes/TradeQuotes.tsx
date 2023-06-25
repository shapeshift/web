import { Collapse, Flex } from '@chakra-ui/react'
import { selectQuotes, selectSelectedSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import type { TradeQuoteLoadedProps } from './TradeQuote'
import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen }) => {
  const sortedQuotes = useAppSelector(selectQuotes)
  const activeSwapperName = useAppSelector(selectSelectedSwapperName)

  const bestQuoteData = sortedQuotes?.[0]

  const quotes = sortedQuotes?.map((apiQuote, i) => {
    const { quote, swapperName, inputOutputRatio, error } = apiQuote

    const quoteDataShim: TradeQuoteLoadedProps['quoteData'] = {
      isLoading: false,
      quote,
      error,
      swapperName,
      inputOutputRatio,
    }

    // TODO(woodenfurniture): we may want to display per-swapper errors here
    if (!quote || !bestQuoteData) return null

    // TODO(woodenfurniture): use quote ID when we want to support multiple quotes per swapper
    const isActive = activeSwapperName === swapperName

    return (
      <TradeQuote
        isActive={isActive}
        isBest={i === 0}
        key={swapperName}
        quoteData={quoteDataShim}
        bestInputOutputRatio={bestQuoteData?.inputOutputRatio}
      />
    )
  })

  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        {quotes}
      </Flex>
    </Collapse>
  )
}

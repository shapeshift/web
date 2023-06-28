import { Collapse, Flex } from '@chakra-ui/react'
import type { TradeQuoteResult } from 'components/MultiHopTrade/types'
import { selectSelectedSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  sortedQuotes: TradeQuoteResult[]
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen, sortedQuotes }) => {
  const activeSwapperName = useAppSelector(selectSelectedSwapperName)

  const bestQuoteData = sortedQuotes[0]

  const quotes = sortedQuotes.map((quoteData, i) => {
    const { data, swapperName } = quoteData
    const quote = data?.isOk() ? data.unwrap() : undefined

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
  })

  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        {quotes}
      </Flex>
    </Collapse>
  )
}

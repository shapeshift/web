import { Collapse, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'

import { getTotalReceiveAmountCryptoPrecision } from './helpers'
import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen }) => {
  const { selectedQuote, sortedQuotes } = useGetTradeQuotes()

  const activeSwapperName = selectedQuote?.swapperName
  const bestQuoteData = sortedQuotes[0]
  const bestQuote = bestQuoteData?.data?.isOk() ? bestQuoteData.data.unwrap() : undefined

  const bestTotalReceiveAmountCryptoPrecision = useMemo(
    () =>
      bestQuote && bestQuoteData
        ? getTotalReceiveAmountCryptoPrecision({
            quote: bestQuote,
            swapperName: bestQuoteData.swapperName,
          })
        : '0',
    [bestQuote, bestQuoteData],
  )

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
        bestTotalReceiveAmountCryptoPrecision={bestTotalReceiveAmountCryptoPrecision}
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

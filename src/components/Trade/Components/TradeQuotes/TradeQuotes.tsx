import { Collapse, Flex } from '@chakra-ui/react'
import type { SwapperWithQuoteMetadata } from '@shapeshiftoss/swapper'
import { useCallback } from 'react'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  isLoading?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen, isLoading }) => {
  const {
    state: { activeSwapperWithMetadata, availableSwappersWithMetadata },
    dispatch: swapperDispatch,
  } = useSwapperState()
  const activeSwapperName = activeSwapperWithMetadata?.swapper.name
  const handleSelectSwapper = useCallback(
    (activeSwapperWithMetadata: SwapperWithQuoteMetadata) =>
      swapperDispatch({
        type: SwapperActionType.SET_ACTIVE_SWAPPER,
        payload: activeSwapperWithMetadata,
      }),
    [swapperDispatch],
  )

  console.log('xxx availableSwappersWithMetadata', availableSwappersWithMetadata)
  const quotes = availableSwappersWithMetadata
    ? availableSwappersWithMetadata?.map((swapperWithMetadata, i) => {
        const isActive = activeSwapperName === swapperWithMetadata.swapper.name
        return (
          <TradeQuote
            key={swapperWithMetadata.swapper.name}
            isBest={i === 0}
            isLoading={isLoading}
            isActive={isActive}
            onClick={handleSelectSwapper}
            swapperWithMetadata={swapperWithMetadata}
          />
        )
      })
    : null

  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        {quotes}
      </Flex>
    </Collapse>
  )
}

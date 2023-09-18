import { ArrowDownIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransitionY } from 'components/SlideTransitionY'
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
  const translate = useTranslate()
  const [showAll, setShowAll] = useState(false)
  const bestQuoteData = sortedQuotes[0]
  const bottomOverlay = useColorModeValue(
    'linear-gradient(to bottom,  rgba(255,255,255,0) 0%,rgba(255,255,255,0.4) 100%)',
    'linear-gradient(to bottom,  rgba(24,27,30,0) 0%,rgba(24,27,30,0.9) 100%)',
  )

  const hasMoreThanOneQuote = useMemo(() => {
    return sortedQuotes.length > 1
  }, [sortedQuotes.length])

  const handleShowAll = useCallback(() => {
    setShowAll(!showAll)
  }, [showAll])

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

  const quoteOverlayAfter = useMemo(() => {
    return {
      content: '""',
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: '80px',
      width: '100%',
      bg: bottomOverlay,
      display: showAll || !hasMoreThanOneQuote ? 'none' : 'block',
    }
  }, [bottomOverlay, hasMoreThanOneQuote, showAll])

  return (
    <Box position='relative' _after={quoteOverlayAfter}>
      <AnimatePresence>
        <SlideTransitionY>
          {hasMoreThanOneQuote && !showAll && (
            <Button
              borderRadius='full'
              position='absolute'
              left='50%'
              bottom='1rem'
              size='sm'
              transform='translateX(-50%)'
              onClick={handleShowAll}
              zIndex={3}
              backdropFilter='blur(15px)'
              rightIcon={<ArrowDownIcon />}
              boxShadow='lg'
              borderWidth={1}
            >
              {translate('common.showAll')}
            </Button>
          )}
        </SlideTransitionY>
      </AnimatePresence>

      <Flex
        flexDir='column'
        width='full'
        px={2}
        pt={0}
        maxHeight={showAll ? '5000px' : '230px'}
        overflowY='hidden'
        pb={4}
        transitionProperty='max-height'
        transitionDuration='0.65s'
        transitionTimingFunction='ease-in-out'
        gap={2}
      >
        {quotes}
      </Flex>
    </Box>
  )
})

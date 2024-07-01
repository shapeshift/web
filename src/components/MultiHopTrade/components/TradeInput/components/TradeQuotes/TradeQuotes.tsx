import { Box, Flex } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import orderBy from 'lodash/orderBy'
import { memo, useEffect, useMemo } from 'react'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import type { ApiQuote } from 'state/apis/swapper/types'
import { getBuyAmountAfterFeesCryptoPrecision } from 'state/slices/tradeQuoteSlice/helpers'
import {
  selectActiveQuoteMetaOrDefault,
  selectIsSwapperResponseAvailable,
  selectIsTradeQuoteRequestAborted,
  selectLoadingSwappers,
  selectSortedTradeQuotes,
  selectTradeQuoteDisplayCache,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeQuote } from './TradeQuote'

const MotionBox = motion(Box)

type TradeQuotesProps = {
  isLoading: boolean
  onBack?: () => void
}

const motionBoxProps = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0, overflow: 'hidden' },
  transition: { type: 'spring', stiffness: 100, damping: 20 },
}

export const sortQuotes = (
  unorderedQuotes: ({ originalIndex: number } & ApiQuote)[],
): ApiQuote[] => {
  return orderBy(
    unorderedQuotes,
    ['originalIndex', 'inputOutputRatio', 'swapperName'],
    ['asc', 'desc', 'asc'],
  )
}

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(({ isLoading, onBack }) => {
  const dispatch = useAppDispatch()

  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const sortedQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isSwapperQuoteAvailable = useAppSelector(selectIsSwapperResponseAvailable)
  const tradeQuoteDisplayCache = useAppSelector(selectTradeQuoteDisplayCache)
  const loadingSwappers = useAppSelector(selectLoadingSwappers)
  const bestQuoteData = sortedQuotes[0]?.errors.length === 0 ? sortedQuotes[0] : undefined

  useEffect(() => {
    dispatch(
      tradeQuoteSlice.actions.updateTradeQuoteDisplayCache({
        isTradeQuoteApiQueryPending,
        sortedQuotes,
        isSwapperQuoteAvailable,
      }),
    )
  }, [dispatch, isTradeQuoteApiQueryPending, isSwapperQuoteAvailable, sortedQuotes])

  const quotes = useMemo(() => {
    if (isTradeQuoteRequestAborted) {
      return []
    }

    const bestTotalReceiveAmountCryptoPrecision = bestQuoteData?.quote
      ? getBuyAmountAfterFeesCryptoPrecision({
          quote: bestQuoteData.quote,
        })
      : undefined

    return tradeQuoteDisplayCache.map((quoteData, i) => {
      const { swapperName, id, errors, isStale } = quoteData

      const isActive = activeQuoteMeta !== undefined && activeQuoteMeta.identifier === id

      return (
        <MotionBox key={id} layout {...motionBoxProps}>
          <TradeQuote
            isActive={isActive}
            isLoading={Boolean(isTradeQuoteApiQueryPending[quoteData.swapperName]) && isStale}
            isRefetching={
              isLoading ||
              isTradeQuoteApiQueryPending[quoteData.swapperName] ||
              !isSwapperQuoteAvailable[swapperName]
            }
            isBest={i === 0 && errors.length === 0}
            key={id}
            quoteData={quoteData}
            bestTotalReceiveAmountCryptoPrecision={bestTotalReceiveAmountCryptoPrecision}
            bestInputOutputRatio={bestQuoteData?.inputOutputRatio}
            onBack={onBack}
          />
        </MotionBox>
      )
    })
  }, [
    isTradeQuoteRequestAborted,
    bestQuoteData?.quote,
    bestQuoteData?.inputOutputRatio,
    tradeQuoteDisplayCache,
    activeQuoteMeta,
    isTradeQuoteApiQueryPending,
    isLoading,
    isSwapperQuoteAvailable,
    onBack,
  ])

  // add some loading state per swapper so missing quotes have obvious explanation as to why they arent in the list
  // only show these placeholders when quotes aren't already visible in the list
  const fetchingSwappers = useMemo(() => {
    if (isTradeQuoteRequestAborted) {
      return []
    }

    return loadingSwappers.map(swapperName => {
      // Attempt to match other quote identifiers to MotionBox can animate.
      // Typically the identifier is the swapper name but not always.
      const id = swapperName
      const quoteData = {
        id,
        quote: undefined,
        swapperName: swapperName as SwapperName,
        inputOutputRatio: 0,
        errors: [],
        warnings: [],
        isStale: true,
      }
      return (
        <MotionBox key={id} layout {...motionBoxProps}>
          <TradeQuote
            isActive={false}
            isLoading={true}
            isRefetching={false}
            isBest={false}
            key={id}
            // eslint doesn't understand useMemo not possible to use inside map
            // eslint-disable-next-line react-memo/require-usememo
            quoteData={quoteData}
            bestTotalReceiveAmountCryptoPrecision={undefined}
            bestInputOutputRatio={undefined}
            onBack={onBack}
          />
        </MotionBox>
      )
    })
  }, [isTradeQuoteRequestAborted, loadingSwappers, onBack])

  return (
    <Box position='relative'>
      <Flex
        flexDir='column'
        width='full'
        px={2}
        pt={0}
        pb={4}
        transitionProperty='max-height'
        transitionDuration='0.65s'
        transitionTimingFunction='ease-in-out'
        gap={2}
      >
        <LayoutGroup>
          <AnimatePresence>
            {quotes}
            {fetchingSwappers}
          </AnimatePresence>
        </LayoutGroup>
      </Flex>
    </Box>
  )
})

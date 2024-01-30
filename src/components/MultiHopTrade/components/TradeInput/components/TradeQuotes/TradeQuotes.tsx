import { ArrowDownIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { orderBy } from 'lodash'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ApiQuote } from 'state/apis/swapper'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import { selectInputSellAmountCryptoPrecision } from 'state/slices/selectors'
import { getBuyAmountAfterFeesCryptoPrecision } from 'state/slices/tradeQuoteSlice/helpers'
import {
  selectActiveQuoteMeta,
  selectIsSwapperQuoteAvailable,
  selectSortedTradeQuotes,
  selectTradeQuoteDisplayCache,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeQuote } from './TradeQuote'

const MotionBox = motion(Box)

type TradeQuotesProps = {
  isLoading: boolean
}

const arrowDownIcon = <ArrowDownIcon />

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

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(({ isLoading }) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const [showAll, setShowAll] = useState(false)
  const bottomOverlay = useColorModeValue(
    'linear-gradient(to bottom,  rgba(255,255,255,0) 0%,rgba(255,255,255,0.4) 100%)',
    'linear-gradient(to bottom,  rgba(24,27,30,0) 0%,rgba(24,27,30,0.9) 100%)',
  )

  const sortedQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMeta)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isSwapperQuoteAvailable = useAppSelector(selectIsSwapperQuoteAvailable)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const tradeQuoteDisplayCache = useAppSelector(selectTradeQuoteDisplayCache)
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

  const hasMoreThanOneQuote = useMemo(() => {
    return sortedQuotes.length > 1
  }, [sortedQuotes.length])

  const handleShowAll = useCallback(() => {
    setShowAll(!showAll)
  }, [showAll])

  const quotes = useMemo(() => {
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
          />
        </MotionBox>
      )
    })
  }, [
    activeQuoteMeta,
    bestQuoteData,
    isLoading,
    isTradeQuoteApiQueryPending,
    isSwapperQuoteAvailable,
    tradeQuoteDisplayCache,
  ])

  // add some loading state per swapper so missing quotes have obvious explanation as to why they arent in the list
  // only show these placeholders when quotes aren't already visible in the list
  const fetchingSwappers = useMemo(() => {
    if (bnOrZero(sellAmountCryptoPrecision).lte(0)) {
      return []
    }

    return Object.entries(isSwapperQuoteAvailable)
      .filter(
        ([swapperName, isQuoteAvailable]) =>
          // don't render a loading placeholder for the test swapper
          swapperName !== SwapperName.Test &&
          // only render loading placeholders for swappers that are still fetching data
          (!isQuoteAvailable || isTradeQuoteApiQueryPending[swapperName as SwapperName]) &&
          // filter out entries that already have a placeholder
          !tradeQuoteDisplayCache.some(quoteData => quoteData.swapperName === swapperName),
      )
      .map(([swapperName, _isQuoteAvailable]) => {
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
            />
          </MotionBox>
        )
      })
  }, [
    isTradeQuoteApiQueryPending,
    isSwapperQuoteAvailable,
    sellAmountCryptoPrecision,
    tradeQuoteDisplayCache,
  ])

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
              rightIcon={arrowDownIcon}
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

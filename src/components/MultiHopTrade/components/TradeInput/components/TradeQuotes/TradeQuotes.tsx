import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  Tag,
} from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { memo, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import { getBuyAmountAfterFeesCryptoPrecision } from 'state/slices/tradeQuoteSlice/helpers'
import {
  selectActiveQuoteMetaOrDefault,
  selectIsSwapperResponseAvailable,
  selectIsTradeQuoteRequestAborted,
  selectLoadingSwappers,
  selectSortedTradeQuotes,
  selectUserInvalidTradeQuotes,
  selectUserValidTradeQuotes,
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

const noQuotesIcon = (
  <svg xmlns='http://www.w3.org/2000/svg' width='43' height='42' viewBox='0 0 43 42' fill='none'>
    <g clip-path='url(#clip0_636_4564)'>
      <path
        d='M5.75 33.25C5.75 34.1783 6.11875 35.0685 6.77513 35.7249C7.4315 36.3813 8.32174 36.75 9.25 36.75C10.1783 36.75 11.0685 36.3813 11.7249 35.7249C12.3813 35.0685 12.75 34.1783 12.75 33.25C12.75 32.3217 12.3813 31.4315 11.7249 30.7751C11.0685 30.1187 10.1783 29.75 9.25 29.75C8.32174 29.75 7.4315 30.1187 6.77513 30.7751C6.11875 31.4315 5.75 32.3217 5.75 33.25Z'
        stroke='white'
        stroke-opacity='0.36'
        stroke-width='3'
        stroke-linecap='round'
        stroke-linejoin='round'
      />
      <path
        d='M33.75 12.25C34.6783 12.25 35.5685 11.8813 36.2249 11.2249C36.8813 10.5685 37.25 9.67826 37.25 8.75C37.25 7.82174 36.8813 6.9315 36.2249 6.27513C35.5685 5.61875 34.6783 5.25 33.75 5.25C32.8217 5.25 31.9315 5.61875 31.2751 6.27513C30.6187 6.9315 30.25 7.82174 30.25 8.75C30.25 9.67826 30.6187 10.5685 31.2751 11.2249C31.9315 11.8813 32.8217 12.25 33.75 12.25Z'
        stroke='white'
        stroke-opacity='0.36'
        stroke-width='3'
        stroke-linecap='round'
        stroke-linejoin='round'
      />
      <path
        d='M19.75 33.25H29.375C30.9995 33.25 32.5574 32.6047 33.706 31.456C34.8547 30.3074 35.5 28.7495 35.5 27.125C35.5 25.5005 34.8547 23.9426 33.706 22.794C32.5574 21.6453 30.9995 21 29.375 21H15.375C13.7505 21 12.1926 20.3547 11.044 19.206C9.89531 18.0574 9.25 16.4995 9.25 14.875C9.25 13.2505 9.89531 11.6926 11.044 10.544C12.1926 9.39531 13.7505 8.75 15.375 8.75H23.25'
        stroke='white'
        stroke-opacity='0.36'
        stroke-width='3'
        stroke-linecap='round'
        stroke-linejoin='round'
      />
    </g>
    <defs>
      <clipPath id='clip0_636_4564'>
        <rect width='42' height='42' fill='white' transform='translate(0.5)' />
      </clipPath>
    </defs>
  </svg>
)

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(({ isLoading, onBack }) => {
  const dispatch = useAppDispatch()

  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const sortedQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isSwapperQuoteAvailable = useAppSelector(selectIsSwapperResponseAvailable)
  const validTradeQuotesDisplayCache = useAppSelector(selectUserValidTradeQuotes)
  const invalidTradeQuotesDisplayCache = useAppSelector(selectUserInvalidTradeQuotes)
  const loadingSwappers = useAppSelector(selectLoadingSwappers)
  const bestQuoteData = sortedQuotes[0]?.errors.length === 0 ? sortedQuotes[0] : undefined
  const translate = useTranslate()

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

    return validTradeQuotesDisplayCache.map((quoteData, i) => {
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
    validTradeQuotesDisplayCache,
    activeQuoteMeta,
    isTradeQuoteApiQueryPending,
    isLoading,
    isSwapperQuoteAvailable,
    onBack,
  ])

  const invalidQuotes = useMemo(() => {
    if (isTradeQuoteRequestAborted) {
      return []
    }

    const bestTotalReceiveAmountCryptoPrecision = bestQuoteData?.quote
      ? getBuyAmountAfterFeesCryptoPrecision({
          quote: bestQuoteData.quote,
        })
      : undefined

    return invalidTradeQuotesDisplayCache.map((quoteData, i) => {
      const { swapperName, id, errors, isStale } = quoteData

      const isActive = activeQuoteMeta !== undefined && activeQuoteMeta.identifier === id

      return (
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
      )
    })
  }, [
    isTradeQuoteRequestAborted,
    bestQuoteData?.quote,
    bestQuoteData?.inputOutputRatio,
    invalidTradeQuotesDisplayCache,
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
    <Flex position='relative' height='full'>
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
        minHeight='full'
      >
        <Flex minHeight='calc(100% - 22px)' flexDirection='column' gap={2}>
          <LayoutGroup>
            <AnimatePresence>
              {quotes}
              {fetchingSwappers}
            </AnimatePresence>
          </LayoutGroup>

          {!quotes.length && !fetchingSwappers.length ? (
            <Flex height='100%' whiteSpace='normal' alignItems='center' justifyContent='center'>
              <Flex
                maxWidth='300px'
                textAlign='center'
                flexDirection='column'
                justifyContent='center'
                alignItems='center'
              >
                {noQuotesIcon}
                <Text translation='trade.noQuotesAvailable' mt={2} />
                <Text translation='trade.noQuotesAvailableDescription' color='text.subtle' />
              </Flex>
            </Flex>
          ) : null}
        </Flex>

        <Accordion allowMultiple>
          <AccordionItem borderBottom='none' borderTop='1px solid' borderColor='border.base'>
            <h2>
              <AccordionButton color='text.subtle'>
                <Box as='span' flex='1' textAlign='left'>
                  {translate('trade.unavailableQuotes')}
                </Box>
                <Flex alignItems='center'>
                  <Tag colorScheme='gray' size='sm' me={2} lineHeight='1'>
                    {invalidQuotes.length}
                  </Tag>
                  <AccordionIcon />
                </Flex>
              </AccordionButton>
            </h2>
            <AccordionPanel px={0} whiteSpace='normal'>
              <Flex
                flexDir='column'
                width='full'
                pt={0}
                transitionProperty='max-height'
                transitionDuration='0.65s'
                transitionTimingFunction='ease-in-out'
                gap={2}
              >
                {invalidQuotes}
              </Flex>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Flex>
    </Flex>
  )
})

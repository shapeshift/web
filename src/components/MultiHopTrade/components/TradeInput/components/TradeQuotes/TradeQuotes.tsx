import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  Icon,
  Tag,
} from '@chakra-ui/react'
import { dogeAssetId } from '@shapeshiftoss/caip'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { FaDog } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { TradeQuote } from './TradeQuote'

import { PathIcon } from '@/components/Icons/PathIcon'
import { Text } from '@/components/Text'
import { selectIsTradeQuoteApiQueryPending } from '@/state/apis/swapper/selectors'
import type { ApiQuote } from '@/state/apis/swapper/types'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
import { selectInputBuyAsset, selectInputSellAsset } from '@/state/slices/tradeInputSlice/selectors'
import { getBestQuotesByCategory } from '@/state/slices/tradeQuoteSlice/helpers'
import {
  selectActiveQuoteMetaOrDefault,
  selectIsSwapperResponseAvailable,
  selectIsTradeQuoteRequestAborted,
  selectLoadingSwappers,
  selectSortedTradeQuotes,
  selectUserAvailableTradeQuotes,
  selectUserUnavailableTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const MotionBox = motion(Box)

type TradeQuotesProps = {
  onBack?: () => void
}

const motionBoxProps = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0, overflow: 'hidden' },
  transition: { type: 'spring', stiffness: 100, damping: 20 },
}

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(({ onBack }) => {
  const dispatch = useAppDispatch()

  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const sortedQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isSwapperQuoteAvailable = useAppSelector(selectIsSwapperResponseAvailable)
  const availableTradeQuotesDisplayCache = useAppSelector(selectUserAvailableTradeQuotes)
  const unavailableTradeQuotesDisplayCache = useAppSelector(selectUserUnavailableTradeQuotes)
  const loadingSwappers = useAppSelector(selectLoadingSwappers)
  const translate = useTranslate()
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const unavailableAccordionRef = useRef<HTMLDivElement>(null)
  const sortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)

  const bestQuotesByCategory = useMemo(
    () => getBestQuotesByCategory(availableTradeQuotesDisplayCache),
    [availableTradeQuotesDisplayCache],
  )

  const shouldUseComisSansMs = useMemo(() => {
    return buyAsset?.assetId === dogeAssetId || sellAsset?.assetId === dogeAssetId
  }, [buyAsset?.assetId, sellAsset?.assetId])

  useEffect(() => {
    dispatch(
      tradeQuoteSlice.actions.updateTradeQuoteDisplayCache({
        isTradeQuoteApiQueryPending,
        sortedQuotes,
        isSwapperQuoteAvailable,
      }),
    )
  }, [dispatch, isTradeQuoteApiQueryPending, isSwapperQuoteAvailable, sortedQuotes, sortOption])

  const isQuoteLoading = useCallback(
    (quoteData: ApiQuote) => {
      const { isStale } = quoteData

      return Boolean(isTradeQuoteApiQueryPending[quoteData.swapperName]) && isStale
    },
    [isTradeQuoteApiQueryPending],
  )

  const availableQuotes = useMemo(() => {
    if (isTradeQuoteRequestAborted) {
      return []
    }

    return availableTradeQuotesDisplayCache.map(quoteData => {
      const { id } = quoteData

      const isActive = activeQuoteMeta !== undefined && activeQuoteMeta.identifier === id

      return (
        <MotionBox key={id} layout {...motionBoxProps}>
          <TradeQuote
            isActive={isActive}
            isLoading={isQuoteLoading(quoteData)}
            isBestRate={bestQuotesByCategory.bestRate === quoteData.id}
            isFastest={bestQuotesByCategory.fastest === quoteData.id}
            isLowestGas={bestQuotesByCategory.lowestGas === quoteData.id}
            key={id}
            quoteData={quoteData}
            onBack={onBack}
          />
        </MotionBox>
      )
    })
  }, [
    isTradeQuoteRequestAborted,
    availableTradeQuotesDisplayCache,
    activeQuoteMeta,
    isQuoteLoading,
    bestQuotesByCategory,
    onBack,
  ])

  const unavailableQuotes = useMemo(() => {
    if (isTradeQuoteRequestAborted) {
      return []
    }

    return unavailableTradeQuotesDisplayCache.map(quoteData => {
      return (
        <TradeQuote
          isActive={false}
          isLoading={isQuoteLoading(quoteData)}
          key={quoteData.id}
          quoteData={quoteData}
          onBack={onBack}
        />
      )
    })
  }, [isTradeQuoteRequestAborted, unavailableTradeQuotesDisplayCache, isQuoteLoading, onBack])

  const unavailableQuotesLength = useMemo(
    () =>
      unavailableTradeQuotesDisplayCache.filter(
        unavailableQuote =>
          ![TradeQuoteValidationError.UnknownError, SwapperTradeQuoteError.UnknownError].includes(
            unavailableQuote.errors?.[0]?.error,
          ),
      ).length,
    [unavailableTradeQuotesDisplayCache],
  )

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
            key={id}
            // eslint doesn't understand useMemo not possible to use inside map
            // eslint-disable-next-line react-memo/require-usememo
            quoteData={quoteData}
            onBack={onBack}
          />
        </MotionBox>
      )
    })
  }, [isTradeQuoteRequestAborted, loadingSwappers, onBack])

  return (
    <Flex position='relative' minHeight='full'>
      <Flex
        flexDir='column'
        width='full'
        px={2}
        pt={0}
        transitionProperty='max-height'
        transitionDuration='0.65s'
        transitionTimingFunction='ease-in-out'
        gap={2}
        minHeight='full'
      >
        <Flex flexDirection='column' gap={2} flexGrow='1'>
          <LayoutGroup>
            <AnimatePresence>
              {availableQuotes}
              {fetchingSwappers}
            </AnimatePresence>
          </LayoutGroup>

          {!availableQuotes.length && !fetchingSwappers.length ? (
            <Flex height='100%' whiteSpace='normal' alignItems='center' justifyContent='center'>
              <Flex
                maxWidth='300px'
                textAlign='center'
                flexDirection='column'
                justifyContent='center'
                alignItems='center'
                fontFamily={shouldUseComisSansMs ? 'Comic Sans Ms, sans-serif' : 'inherit'}
              >
                {!shouldUseComisSansMs ? (
                  <PathIcon color='subtle' boxSize={10} fill='none' />
                ) : (
                  <Icon as={FaDog} color='text.subtle' boxSize={10} />
                )}
                <Text translation='trade.noQuotesAvailable' mt={2} />
                <Text translation='trade.noQuotesAvailableDescription' color='text.subtle' />
              </Flex>
            </Flex>
          ) : null}
        </Flex>

        <Accordion allowMultiple ref={unavailableAccordionRef}>
          <AccordionItem borderBottom='none' borderTop='1px solid' borderColor='border.base'>
            <h2>
              <AccordionButton color='text.subtle'>
                <Box as='span' flex='1' textAlign='left'>
                  {translate('trade.unavailableSwappers')}
                </Box>
                <Flex alignItems='center'>
                  <Tag colorScheme='gray' size='sm' me={2} lineHeight='1'>
                    {unavailableQuotesLength}
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
                {unavailableQuotes}
              </Flex>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Flex>
    </Flex>
  )
})

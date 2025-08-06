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
import { TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import { LayoutGroup, motion } from 'framer-motion'
import type { InterpolationOptions } from 'node-polyglot'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { FaDog } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { TradeQuoteIconLoader, VISIBLE_WIDTH } from './components/TradeQuoteIconLoader'
import { TradeQuote } from './TradeQuote'

import { PathIcon } from '@/components/Icons/PathIcon'
import { Text } from '@/components/Text'
import {
  selectIsBatchTradeRateQueryLoading,
  selectIsTradeQuoteApiQueryPending,
} from '@/state/apis/swapper/selectors'
import { BULK_FETCH_RATE_TIMEOUT_MS } from '@/state/apis/swapper/swapperApi'
import type { ApiQuote } from '@/state/apis/swapper/types'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
import { selectInputBuyAsset, selectInputSellAsset } from '@/state/slices/tradeInputSlice/selectors'
import { getBestQuotesByCategory } from '@/state/slices/tradeQuoteSlice/helpers'
import {
  selectActiveQuoteMetaOrDefault,
  selectEnabledSwappersIgnoringCrossAccountTrade,
  selectIsSwapperResponseAvailable,
  selectIsTradeQuoteRequestAborted,
  selectIsTradeQuotesInitialised,
  selectSortedTradeQuotes,
  selectUserAvailableTradeQuotes,
  selectUserUnavailableTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const loadingMessageTranslation = [
  'trade.fetchingQuotes.description',
  { maxTimeSeconds: Math.round(BULK_FETCH_RATE_TIMEOUT_MS / 1000) },
] as [string, InterpolationOptions]

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
  const translate = useTranslate()
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const unavailableAccordionRef = useRef<HTMLDivElement>(null)
  const sortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)
  const loaderSwapperNames = useAppSelector(selectEnabledSwappersIgnoringCrossAccountTrade)
  const isBatchTradeRateQueryLoading = useAppSelector(selectIsBatchTradeRateQueryLoading)
  const hasQuotes =
    availableTradeQuotesDisplayCache.length > 0 || unavailableTradeQuotesDisplayCache.length > 0
  const isQuotesInitialized = useAppSelector(selectIsTradeQuotesInitialised)

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
          <LayoutGroup>{availableQuotes}</LayoutGroup>

          {availableQuotes.length === 0 && isQuotesInitialized && !isBatchTradeRateQueryLoading ? (
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
          {!hasQuotes && isBatchTradeRateQueryLoading ? (
            <Flex flexDirection='column' alignItems='center' justifyContent='center' height='100%'>
              <TradeQuoteIconLoader swapperNames={loaderSwapperNames} />
              <Box textAlign='center' marginTop={6} maxW={VISIBLE_WIDTH}>
                <Text
                  translation='trade.fetchingQuotes.title'
                  fontWeight='medium'
                  paddingBottom={1}
                />
                <Text
                  fontSize='sm'
                  fontWeight='medium'
                  whiteSpace='normal'
                  translation={loadingMessageTranslation}
                  color='text.subtle'
                />
              </Box>
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

import { Flex, Skeleton, VStack } from '@chakra-ui/react'
import { useEffect, useMemo } from 'react'

import { FiatRampQuoteCard } from './FiatRampQuoteCard'

import { PathIcon } from '@/components/Icons/PathIcon'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { useGetRampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/hooks/useGetRampQuotes'
import { Text } from '@/components/Text'
import {
  selectBuyFiatCurrency,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectSelectedFiatRampQuote,
  selectSellFiatAmount,
  selectSellFiatCurrency,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type PaymentMethod = 'Card' | 'Bank Transfer' | 'Apple Pay' | 'Google Pay' | 'SEPA'

type RampQuotesProps = {
  isLoading?: boolean
  onBack?: () => void
  direction: FiatRampAction
}

export const RampQuotes: React.FC<RampQuotesProps> = ({ isLoading = false, onBack, direction }) => {
  const dispatch = useAppDispatch()
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmount = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)

  const sellFiatAmount = useAppSelector(selectSellFiatAmount)
  const selectedQuote = useAppSelector(selectSelectedFiatRampQuote)

  const quoteAmount = useMemo(() => {
    return direction === FiatRampAction.Buy ? sellFiatAmount : sellAmount
  }, [direction, sellAmount, sellFiatAmount])

  const { queries: quotesQueries, sortedQuotes } = useGetRampQuotes({
    fiatCurrency: direction === FiatRampAction.Buy ? sellFiatCurrency : buyFiatCurrency,
    assetId: direction === FiatRampAction.Buy ? buyAsset.assetId : sellAsset.assetId,
    amount: quoteAmount,
    direction,
  })

  const displayQuotes = useMemo(() => {
    return sortedQuotes
  }, [sortedQuotes])

  const isQueryLoading = useMemo(() => {
    return quotesQueries.some(query => query.isLoading) || isLoading
  }, [quotesQueries, isLoading])

  // Auto-select the best quote when quotes are available and no quote is selected
  // This only happens on first load or when amount changes (not on refetch)
  useEffect(() => {
    if (isQueryLoading && !selectedQuote) return

    if (displayQuotes.length > 0) {
      const bestQuote =
        displayQuotes.find(quote => selectedQuote && selectedQuote.provider === quote.provider) ||
        displayQuotes[0]

      if (bestQuote.id === selectedQuote?.id) return

      dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(bestQuote))
    }
  }, [displayQuotes, selectedQuote, dispatch, isQueryLoading])

  if (isQueryLoading && !selectedQuote) {
    return (
      <VStack spacing={4} p={4}>
        {[1, 2].map(i => (
          <Skeleton key={i} w='full' h='120px' borderRadius='md' />
        ))}
      </VStack>
    )
  }

  return (
    <VStack spacing={4} p={4} align='stretch'>
      {!displayQuotes.length ? (
        <Flex height='100%' whiteSpace='normal' alignItems='center' justifyContent='center'>
          <Flex
            maxWidth='300px'
            textAlign='center'
            flexDirection='column'
            justifyContent='center'
            alignItems='center'
          >
            <PathIcon color='subtle' boxSize={10} fill='none' />
            <Text translation='trade.noQuotesAvailable' mt={2} />
            <Text translation='trade.noQuotesAvailableDescription' color='text.subtle' />
          </Flex>
        </Flex>
      ) : null}

      {displayQuotes.map(quote => (
        <FiatRampQuoteCard
          key={quote.id}
          isActive={selectedQuote?.id === quote.id}
          isBestRate={quote.isBestRate}
          quote={quote}
          isLoading={isQueryLoading}
          onBack={onBack}
          fiatCurrency={direction === FiatRampAction.Buy ? sellFiatCurrency : buyFiatCurrency}
          direction={direction}
        />
      ))}
    </VStack>
  )
}

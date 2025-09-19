import { Flex, Skeleton, VStack } from '@chakra-ui/react'
import { useEffect, useMemo } from 'react'

import { FiatRampQuoteCard } from './FiatRampQuoteCard'

import { PathIcon } from '@/components/Icons/PathIcon'
import { fiatCurrencyObjectsByCode } from '@/components/Modals/FiatRamps/config'
import { useGetRampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/hooks/useGetRampQuotes'
import { Text } from '@/components/Text'
import { FiatTypeEnum } from '@/constants/FiatTypeEnum'
import { isSome } from '@/lib/utils'
import {
  selectBuyFiatAsset,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectSelectedFiatRampQuote,
  selectSellFiatAmount,
  selectSellFiatAsset,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type PaymentMethod = 'Card' | 'Bank Transfer' | 'Apple Pay' | 'Google Pay' | 'SEPA'

type RampQuotesProps = {
  isLoading?: boolean
  onBack?: () => void
  direction: 'buy' | 'sell'
}

export const RampQuotes: React.FC<RampQuotesProps> = ({ isLoading = false, onBack, direction }) => {
  const dispatch = useAppDispatch()
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmount = useAppSelector(selectInputSellAmountCryptoPrecision)
  const maybeSellFiat = useAppSelector(selectSellFiatAsset)
  const maybeBuyFiat = useAppSelector(selectBuyFiatAsset)

  const sellFiat = maybeSellFiat ?? fiatCurrencyObjectsByCode[FiatTypeEnum.USD]
  const buyFiat = maybeBuyFiat ?? fiatCurrencyObjectsByCode[FiatTypeEnum.USD]

  const sellFiatAmount = useAppSelector(selectSellFiatAmount)
  const selectedQuote = useAppSelector(selectSelectedFiatRampQuote)

  const quoteAmount = useMemo(() => {
    return direction === 'buy' ? sellFiatAmount : sellAmount
  }, [direction, sellAmount, sellFiatAmount])

  const quotesQueries = useGetRampQuotes({
    fiat: direction === 'buy' ? sellFiat : buyFiat,
    assetId: direction === 'buy' ? buyAsset.assetId : sellAsset.assetId,
    amount: quoteAmount,
    direction,
  })

  const displayQuotes = useMemo(() => {
    const quotes = quotesQueries.map(query => query.data).filter(isSome)

    if (!quotes || quotes.length === 0) return []

    return quotes
  }, [quotesQueries])

  // Auto-select the first quote when quotes are available and no quote is selected
  useEffect(() => {
    if (displayQuotes.length > 0 && !selectedQuote) {
      dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(displayQuotes[0]))
    }
  }, [displayQuotes, selectedQuote, dispatch])

  const isQueryLoading = useMemo(() => {
    return quotesQueries.some(query => query.isLoading) || isLoading
  }, [quotesQueries, isLoading])

  if (isQueryLoading) {
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
          isFastest={quote.isFastest}
          quote={quote}
          isLoading={isLoading}
          onBack={onBack}
          fiatCurrency={sellFiat}
          direction={direction}
        />
      ))}
    </VStack>
  )
}

import { Flex, Skeleton, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { FiatRampQuoteCard } from './FiatRampQuoteCard'

import { PathIcon } from '@/components/Icons/PathIcon'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { useGetRampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/hooks/useGetRampQuotes'
import { Text } from '@/components/Text'
import {
  selectBuyFiatAmount,
  selectBuyFiatCurrency,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectSelectedBuyFiatRampQuote,
  selectSelectedSellFiatRampQuote,
  selectSellFiatCurrency,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { useAppSelector } from '@/state/store'

export type PaymentMethod = 'Card' | 'Bank Transfer' | 'Apple Pay' | 'Google Pay' | 'SEPA'

type RampQuotesProps = {
  isLoading?: boolean
  onBack?: () => void
  direction: FiatRampAction
}

export const RampQuotes: React.FC<RampQuotesProps> = ({ isLoading = false, onBack, direction }) => {
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)

  const buyFiatAmount = useAppSelector(selectBuyFiatAmount)
  const selectedBuyQuote = useAppSelector(selectSelectedBuyFiatRampQuote)
  const selectedSellQuote = useAppSelector(selectSelectedSellFiatRampQuote)

  const selectedQuote = useMemo(
    () => (direction === FiatRampAction.Buy ? selectedBuyQuote : selectedSellQuote),
    [direction, selectedBuyQuote, selectedSellQuote],
  )

  const quoteAmount = useMemo(() => {
    return direction === FiatRampAction.Buy ? buyFiatAmount : sellAmountCryptoPrecision
  }, [direction, sellAmountCryptoPrecision, buyFiatAmount])

  const { queries: quotesQueries, sortedQuotes } = useGetRampQuotes({
    fiatCurrency: direction === FiatRampAction.Buy ? sellFiatCurrency : buyFiatCurrency,
    assetId: direction === FiatRampAction.Buy ? buyAsset.assetId : sellAsset.assetId,
    amount: quoteAmount,
    direction,
  })

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
      {!sortedQuotes.length ? (
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

      {sortedQuotes.map(quote => (
        <FiatRampQuoteCard
          key={quote.id}
          isActive={selectedQuote?.provider === quote.provider}
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

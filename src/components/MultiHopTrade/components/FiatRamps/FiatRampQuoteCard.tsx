import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'

import { TradeQuoteBadges } from '../TradeInput/components/TradeQuotes/components/TradeQuoteBadges'
import { TradeQuoteCard } from '../TradeInput/components/TradeQuotes/components/TradeQuoteCard'

import { AssetIcon } from '@/components/AssetIcon'
import { FiatRampBadges } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampBadges'
import type { RampQuote } from '@/components/MultiHopTrade/components/FiatRamps/RampQuotes'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'

type FiatRampQuoteProps = {
  isActive: boolean
  isBestRate?: boolean
  isFastest?: boolean
  quote: RampQuote
  isLoading: boolean
  onBack?: () => void
}

export const FiatRampQuoteCard: FC<FiatRampQuoteProps> = memo(
  ({ isActive, isBestRate, isFastest, quote, isLoading, onBack }) => {
    const handleQuoteSelection = useCallback(() => {
      // TODO: Handle quote selection for fiat ramp
      console.log('Selected fiat ramp quote:', quote)
      // For mobile, if the user click on a quote, it should go back
      // even thought I didn't really take care of mobile yet
      onBack && onBack()
    }, [quote, onBack])

    const providerIcon = useMemo(() => {
      return <AssetIcon src={quote.providerLogo} />
    }, [quote.providerLogo])

    const headerContent = useMemo(() => {
      return (
        <Flex justifyContent='space-between' alignItems='center' flexGrow={1}>
          <Box ml='auto'>
            <TradeQuoteBadges
              isBestRate={isBestRate}
              isFastest={isFastest}
              quoteDisplayOption={QuoteDisplayOption.Basic}
            />
          </Box>
        </Flex>
      )
    }, [isBestRate, isFastest])

    const bodyContent = useMemo(() => {
      return (
        <Box p={4} pt={0}>
          <VStack spacing={1} align='start' mb={4}>
            <Text fontSize='lg' fontWeight='bold' color='text.base'>
              {quote.amount}
            </Text>
            <Text fontSize='sm' color='text.subtle'>
              {/* @TODO: add the fiat amount using rate when wiring up */}≈ $100
            </Text>
          </VStack>

          <HStack spacing={2} wrap='wrap'>
            <FiatRampBadges
              quoteDisplayOption={QuoteDisplayOption.Basic}
              isCreditCard={quote.isCreditCard}
              isBankTransfer={quote.isBankTransfer}
              isApplePay={quote.isApplePay}
              isGooglePay={quote.isGooglePay}
              isSepa={quote.isSepa}
            />
          </HStack>
        </Box>
      )
    }, [quote])

    const isDisabled = isLoading
    const isActionable = bnOrZero(quote.rate).gt(0)

    return (
      <TradeQuoteCard
        icon={providerIcon}
        title={quote.provider}
        headerContent={headerContent}
        bodyContent={bodyContent}
        onClick={handleQuoteSelection}
        isActive={isActive}
        isActionable={isActionable}
        isDisabled={isDisabled}
      />
    )
  },
)

import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'

import { TradeQuoteBadges } from '../TradeInput/components/TradeQuotes/components/TradeQuoteBadges'
import { TradeQuoteCard } from '../TradeInput/components/TradeQuotes/components/TradeQuoteCard'

import { AssetIcon } from '@/components/AssetIcon'
import type { RampQuote } from '@/components/Modals/FiatRamps/config'
import { FiatRampBadges } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampBadges'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectBuyFiatAsset,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectSellFiatAsset,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type FiatRampQuoteProps = {
  isActive: boolean
  isBestRate?: boolean
  isFastest?: boolean
  quote: RampQuote
  isLoading: boolean
  onBack?: () => void
  fiatCurrency?: string
  fiatAmount?: string
  direction?: 'buy' | 'sell'
}

export const FiatRampQuoteCard: FC<FiatRampQuoteProps> = memo(
  ({
    isActive,
    isBestRate,
    isFastest,
    quote,
    isLoading,
    onBack,
    fiatCurrency,
    fiatAmount,
    direction,
  }) => {
    const dispatch = useAppDispatch()
    const sellAsset = useAppSelector(selectInputSellAsset)
    const buyAsset = useAppSelector(selectInputBuyAsset)
    const buyFiat = useAppSelector(selectBuyFiatAsset)
    const sellFiat = useAppSelector(selectSellFiatAsset)

    const handleQuoteSelection = useCallback(() => {
      dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(quote))

      onBack && onBack()
    }, [quote, onBack, dispatch])

    const providerIcon = useMemo(() => {
      return <AssetIcon src={quote.providerLogo} />
    }, [quote.providerLogo])

    console.log({
      quote,
    })

    const fiatAmountDisplay = useMemo(() => {
      if (!fiatCurrency || !fiatAmount || !quote.rate) return null

      const cryptoAmount = quote.amount
      let calculatedFiatAmount = bnOrZero(cryptoAmount).times(quote.rate).toFixed(2)

      if (direction === 'buy') {
        return `${calculatedFiatAmount} ${sellFiat}`
      }

      return calculatedFiatAmount
    }, [fiatCurrency, fiatAmount, quote.rate, quote.amount, direction, sellFiat])

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

    const amounts = useMemo(() => {
      if (direction === 'buy') {
        return (
          <>
            <Text fontSize='lg' fontWeight='bold' color='text.base'>
              {quote.amount} {buyAsset.symbol}
            </Text>
            <Text fontSize='sm' color='text.subtle'>
              {fiatAmountDisplay ? `≈ ${fiatAmountDisplay}` : '≈ $0'}
            </Text>
          </>
        )
      }

      return (
        <>
          <Text fontSize='lg' fontWeight='bold' color='text.base'>
            {fiatAmountDisplay} {buyFiat}
          </Text>
          <Text fontSize='sm' color='text.subtle'>
            {quote.amount} {sellAsset.symbol}
          </Text>
        </>
      )
    }, [quote, buyAsset, sellAsset, direction, fiatAmountDisplay, buyFiat])

    const bodyContent = useMemo(() => {
      return (
        <Box p={4} pt={0}>
          <VStack spacing={1} align='start' mb={4}>
            {amounts}
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
    }, [quote, amounts])

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

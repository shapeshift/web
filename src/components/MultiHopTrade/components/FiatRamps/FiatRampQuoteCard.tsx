import { Box, Flex, HStack, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'

import { TradeQuoteBadges } from '../TradeInput/components/TradeQuotes/components/TradeQuoteBadges'
import { TradeQuoteCard } from '../TradeInput/components/TradeQuotes/components/TradeQuoteCard'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import type { RampQuote } from '@/components/Modals/FiatRamps/config'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatRampBadges } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampBadges'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { preferences, QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectBuyFiatCurrency,
  selectInputBuyAsset,
  selectInputSellAsset,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type FiatRampQuoteProps = {
  isActive: boolean
  isBestRate?: boolean
  quote: RampQuote
  isLoading: boolean
  onBack?: () => void
  fiatCurrency?: FiatCurrencyItem
  fiatAmount?: string
  direction?: FiatRampAction
}

export const FiatRampQuoteCard: FC<FiatRampQuoteProps> = memo(
  ({ isActive, isBestRate, quote, isLoading, onBack, fiatCurrency, direction }) => {
    const dispatch = useAppDispatch()
    const sellAsset = useAppSelector(selectInputSellAsset)
    const buyAsset = useAppSelector(selectInputBuyAsset)
    const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)
    const selectedUserCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)

    const buyAssetMarketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, buyAsset?.assetId ?? ''),
    )
    const sellAssetMarketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, sellAsset?.assetId ?? ''),
    )

    const fiatMarketData = useAppSelector(marketData.selectors.selectFiatMarketData)

    const buyAmountUserCurrency = useMemo(() => {
      return bnOrZero(quote.amount)
        .times(buyAssetMarketData?.price ?? 0)
        .toString()
    }, [quote.amount, buyAssetMarketData])

    const buyAmountCryptoPrecision = useMemo(() => {
      if (direction === FiatRampAction.Buy) {
        return bnOrZero(quote.amount)
          .div(sellAssetMarketData?.price ?? 0)
          .toString()
      }

      const fiatRate = fiatMarketData[buyFiatCurrency?.code]?.price ?? 0

      if (buyFiatCurrency?.code === selectedUserCurrency || !fiatRate)
        return bnOrZero(quote.amount)
          .div(sellAssetMarketData?.price ?? 0)
          .toFixed(sellAsset?.precision ?? 0)

      return bnOrZero(quote.amount)
        .div(fiatRate)
        .div(sellAssetMarketData?.price ?? 0)
        .toFixed(sellAsset?.precision ?? 0)
    }, [
      quote.amount,
      sellAssetMarketData,
      fiatMarketData,
      direction,
      buyFiatCurrency,
      sellAsset,
      selectedUserCurrency,
    ])

    const handleQuoteSelection = useCallback(() => {
      if (direction === FiatRampAction.Buy) {
        dispatch(tradeRampInput.actions.setSelectedBuyFiatRampQuote(quote))
      } else {
        dispatch(tradeRampInput.actions.setSelectedSellFiatRampQuote(quote))
      }

      onBack && onBack()
    }, [quote, onBack, dispatch, direction])

    const providerIcon = useMemo(() => {
      return <AssetIcon src={quote.providerLogo} />
    }, [quote.providerLogo])

    const fiatAmountDisplay = useMemo(() => {
      if (!fiatCurrency || !quote.rate) return '0'

      if (direction === FiatRampAction.Buy) {
        return buyAmountUserCurrency
      }

      return quote.amount
    }, [fiatCurrency, quote.rate, quote.amount, direction, buyAmountUserCurrency])

    const headerContent = useMemo(() => {
      return (
        <Flex justifyContent='space-between' alignItems='center' flexGrow={1}>
          <Box ml='auto'>
            <TradeQuoteBadges
              isBestRate={isBestRate}
              quoteDisplayOption={QuoteDisplayOption.Basic}
            />
          </Box>
        </Flex>
      )
    }, [isBestRate])

    const amounts = useMemo(() => {
      if (direction === FiatRampAction.Buy) {
        return (
          <>
            <Amount.Crypto
              value={quote.amount}
              symbol={buyAsset.symbol}
              fontSize='lg'
              fontWeight='bold'
              color='text.base'
              maximumFractionDigits={8}
              omitDecimalTrailingZeros={true}
            />
            <Amount.Fiat value={fiatAmountDisplay} fontSize='sm' color='text.subtle' prefix='≈' />
          </>
        )
      }

      return (
        <>
          <Amount.Fiat
            value={fiatAmountDisplay}
            fiatType={buyFiatCurrency?.code}
            fontSize='lg'
            fontWeight='bold'
            color='text.base'
          />
          <Amount.Crypto
            value={buyAmountCryptoPrecision}
            symbol={sellAsset.symbol}
            fontSize='sm'
            color='text.subtle'
            fontWeight='bold'
            maximumFractionDigits={8}
            omitDecimalTrailingZeros={true}
          />
        </>
      )
    }, [
      buyAsset,
      sellAsset,
      buyFiatCurrency,
      direction,
      fiatAmountDisplay,
      quote.amount,
      buyAmountCryptoPrecision,
    ])

    const bodyContent = useMemo(() => {
      return (
        <Box p={4} pt={0}>
          <VStack spacing={1} align='start' mb={4}>
            {amounts}
          </VStack>

          <HStack spacing={2} wrap='wrap'>
            <FiatRampBadges
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

import { useColorMode, usePrevious } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import type { FormEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { FiatRampRoutePaths } from './types'

import { AssetIcon } from '@/components/AssetIcon'
import { supportedFiatRamps } from '@/components/Modals/FiatRamps/config'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatRampQuoteTimer } from '@/components/MultiHopTrade/components/FiatRamps/components/FiatRampQuoteTimer'
import { FiatRampTradeBody } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeBody'
import { FiatRampTradeFooter } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeFooter'
import { useGetRampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/hooks/useGetRampQuotes'
import { RampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/RampQuotes'
import type {
  QuoteListProps,
  QuotesComponentProps,
} from '@/components/MultiHopTrade/components/QuoteList/QuoteList'
import { QuoteList } from '@/components/MultiHopTrade/components/QuoteList/QuoteList'
import { SharedTradeInput } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedTradeInput'
import { SlideTransitionRoute } from '@/components/MultiHopTrade/components/SlideTransitionRoute'
import type { CollapsibleQuoteListProps } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { CollapsibleQuoteList } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { useReceiveAddress } from '@/components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { marketApi, marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssets,
  selectMarketDataByFilter,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import {
  selectBuyAccountId,
  selectBuyFiatAmount,
  selectBuyFiatCurrency,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectIsInputtingFiatSellAmount,
  selectManualReceiveAddress,
  selectSelectedBuyFiatRampQuote,
  selectSelectedSellFiatRampQuote,
  selectSellFiatCurrency,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type FiatRampTradeProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
  direction: FiatRampAction
  onChangeTab: (newTab: TradeInputTab) => void
}

export const FiatRampTrade = memo(({ onChangeTab, direction }: FiatRampTradeProps) => {
  const methods = useForm({ mode: 'onChange' })

  return (
    <FormProvider {...methods}>
      <RampRoutes onChangeTab={onChangeTab} direction={direction} />
    </FormProvider>
  )
})

type RampRoutesProps = {
  isCompact?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
  direction: FiatRampAction
}

const RampRoutes = memo(({ onChangeTab, direction }: RampRoutesProps) => {
  const tradeInputRef = useRef<HTMLDivElement | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const {
    state: { isConnected },
  } = useWallet()

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const sellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)
  const buyFiatAmount = useAppSelector(selectBuyFiatAmount)
  const selectedBuyQuote = useAppSelector(selectSelectedBuyFiatRampQuote)
  const selectedSellQuote = useAppSelector(selectSelectedSellFiatRampQuote)
  const buyAccountId = useAppSelector(selectBuyAccountId)
  const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)

  const { price: sellAssetUserCurrencyRate } =
    useAppSelector(state => selectMarketDataByFilter(state, { assetId: sellAsset.assetId })) || {}

  const selectedQuote = useMemo(
    () => (direction === FiatRampAction.Buy ? selectedBuyQuote : selectedSellQuote),
    [direction, selectedBuyQuote, selectedSellQuote],
  )

  const assets = useAppSelector(selectAssets)
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const { colorMode } = useColorMode()
  const popup = useModal('popup')
  const { pathname } = useLocation()
  const queryClient = useQueryClient()

  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const fiatMarketData = useAppSelector(marketData.selectors.selectFiatMarketData)

  const buyAccountFilter = useMemo(() => ({ accountId: buyAccountId ?? '' }), [buyAccountId])

  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountFilter),
  )

  const { walletReceiveAddress } = useReceiveAddress({
    sellAccountId: undefined,
    buyAccountId,
    buyAsset,
  })

  const RampQuotesComponent = useCallback(
    (props: QuotesComponentProps) => {
      return <RampQuotes direction={direction} {...props} />
    },
    [direction],
  )

  const FiatRampQuoteTimerComponent = useCallback(
    () => <FiatRampQuoteTimer direction={direction} />,
    [direction],
  )

  const SideComponent = useCallback(
    (props: CollapsibleQuoteListProps) => {
      return (
        <CollapsibleQuoteList
          QuotesComponent={RampQuotesComponent}
          showQuoteRefreshCountdown={true}
          showSortBy={false}
          QuoteTimerComponent={FiatRampQuoteTimerComponent}
          {...props}
        />
      )
    },
    [RampQuotesComponent, FiatRampQuoteTimerComponent],
  )

  const clearSelectedQuote = useCallback(() => {
    if (direction === FiatRampAction.Buy) {
      dispatch(tradeRampInput.actions.setSelectedBuyFiatRampQuote(null))
      return
    }

    dispatch(tradeRampInput.actions.setSelectedSellFiatRampQuote(null))
  }, [dispatch, direction])

  const handleSellAssetChange = useCallback(
    (asset: Asset | null) => {
      if (asset) {
        dispatch(tradeRampInput.actions.setSellAsset(asset))
        clearSelectedQuote()
      }
    },
    [dispatch, clearSelectedQuote],
  )

  const handleBuyAssetChange = useCallback(
    (asset: Asset | null) => {
      if (asset) {
        dispatch(tradeRampInput.actions.setBuyAsset(asset))
        clearSelectedQuote()
      }
    },
    [dispatch, clearSelectedQuote],
  )

  const handleSellFiatChange = useCallback(
    (fiat: FiatCurrencyItem | null) => {
      if (fiat) {
        dispatch(tradeRampInput.actions.setSellFiatAsset(fiat))
        clearSelectedQuote()
      }
    },
    [dispatch, clearSelectedQuote],
  )

  const handleBuyFiatChange = useCallback(
    (fiat: FiatCurrencyItem | null) => {
      if (fiat) {
        dispatch(tradeRampInput.actions.setBuyFiatAsset(fiat))
        clearSelectedQuote()
      }
    },
    [dispatch, clearSelectedQuote],
  )

  const handleSellAmountChange = useCallback(
    (value: string) => {
      const isRateZero = bnOrZero(sellAssetUserCurrencyRate).isZero()

      // Avoid division by zero
      const sellAmountCryptoPrecision = isInputtingFiatSellAmount
        ? isRateZero
          ? ''
          : bnOrZero(value).div(bnOrZero(sellAssetUserCurrencyRate)).toString()
        : value

      dispatch(tradeRampInput.actions.setSellAmountCryptoPrecision(sellAmountCryptoPrecision))
    },
    [dispatch, sellAssetUserCurrencyRate, isInputtingFiatSellAmount],
  )

  const handleBuyFiatAmountChange = useCallback(
    (amount: string) => {
      dispatch(tradeRampInput.actions.setBuyFiatAmount(amount))
    },
    [dispatch],
  )

  const handleIsInputtingFiatSellAmountChange = useCallback(
    (isInputtingFiatSellAmount: boolean) => {
      dispatch(tradeRampInput.actions.setIsInputtingFiatSellAmount(isInputtingFiatSellAmount))
    },
    [dispatch],
  )

  const { queries: quotesQueries, sortedQuotes } = useGetRampQuotes({
    fiatCurrency: direction === FiatRampAction.Buy ? sellFiatCurrency : buyFiatCurrency,
    assetId: direction === FiatRampAction.Buy ? buyAsset.assetId : sellAsset.assetId,
    amount: direction === FiatRampAction.Buy ? buyFiatAmount : sellAmountCryptoPrecision,
    direction,
  })

  const isFetchingQuotes = useMemo(() => {
    return quotesQueries.some(query => query.isLoading)
  }, [quotesQueries])

  const debouncedBuyDirectionFiatAmount = useDebounce(buyFiatAmount, 1000)
  const debouncedSellDirectionCryptoAmount = useDebounce(sellAmountCryptoPrecision, 1000)

  const previousDebouncedBuyDirectionFiatAmount = usePrevious(debouncedBuyDirectionFiatAmount)
  const previousDebouncedSellDirectionCryptoAmount = usePrevious(debouncedSellDirectionCryptoAmount)

  useEffect(() => {
    if (!fiatMarketData[buyFiatCurrency?.code]) {
      dispatch(
        marketApi.endpoints.findByFiatSymbol.initiate({
          symbol: buyFiatCurrency?.code,
        }),
      )
    }
  }, [dispatch, buyFiatCurrency?.code, fiatMarketData])

  // Unselect quote when amount changes (but not on refetch)
  useEffect(() => {
    if (!(sellFiatCurrency || sellAsset || buyFiatCurrency || buyAsset)) return
    if (
      direction === FiatRampAction.Buy &&
      previousDebouncedBuyDirectionFiatAmount !== debouncedBuyDirectionFiatAmount
    ) {
      queryClient.invalidateQueries({ queryKey: ['rampQuote'] })
      clearSelectedQuote()
    }

    if (
      direction === FiatRampAction.Sell &&
      previousDebouncedSellDirectionCryptoAmount !== debouncedSellDirectionCryptoAmount
    ) {
      queryClient.invalidateQueries({ queryKey: ['rampQuote'] })
      clearSelectedQuote()
    }
  }, [
    debouncedBuyDirectionFiatAmount,
    debouncedSellDirectionCryptoAmount,
    sellFiatCurrency,
    sellAsset,
    buyFiatCurrency,
    buyAsset,
    queryClient,
    direction,
    previousDebouncedBuyDirectionFiatAmount,
    previousDebouncedSellDirectionCryptoAmount,
    clearSelectedQuote,
  ])

  // Auto-select the best quote when quotes are available and no quote is selected
  // This only happens on first load or when amount/asset/fiat changes (not on refetch)
  useEffect(() => {
    // Wait for all quotes to be fetched to select the best quote
    if (isFetchingQuotes) return
    if (pathname.includes('quotes')) return

    if (sortedQuotes.length > 0 && !selectedQuote) {
      const bestQuote = sortedQuotes[0]

      if (!bestQuote) return

      if (direction === FiatRampAction.Buy) {
        dispatch(tradeRampInput.actions.setSelectedBuyFiatRampQuote(bestQuote))
      } else {
        dispatch(tradeRampInput.actions.setSelectedSellFiatRampQuote(bestQuote))
      }
    }
  }, [sortedQuotes, selectedQuote, dispatch, isFetchingQuotes, pathname, direction])

  const handleSubmit = useCallback(
    async (e: FormEvent<unknown>) => {
      e.preventDefault()
      if (!selectedQuote?.provider) return
      if (!isConnected) return
      if (direction === FiatRampAction.Buy && !buyAccountMetadata) return

      const ramp = supportedFiatRamps[selectedQuote.provider]
      const mpData = {
        action: direction,
        assetId: getMaybeCompositeAssetSymbol(
          direction === FiatRampAction.Buy ? buyAsset?.assetId ?? '' : sellAsset?.assetId ?? '',
          assets,
        ),
        ramp: ramp.id,
      }

      getMixPanel()?.track(MixPanelEvent.FiatRamp, mpData)
      const url = await ramp.onSubmit({
        action: direction,
        assetId:
          direction === FiatRampAction.Buy ? buyAsset?.assetId ?? '' : sellAsset?.assetId ?? '',
        address: manualReceiveAddress ?? walletReceiveAddress ?? '',
        fiatCurrency:
          direction === FiatRampAction.Buy ? sellFiatCurrency.code : buyFiatCurrency.code,
        fiatAmount: direction === FiatRampAction.Buy ? buyFiatAmount : selectedQuote?.amount ?? '0',
        amountCryptoPrecision:
          direction === FiatRampAction.Sell ? sellAmountCryptoPrecision : undefined,
        options: {
          language: selectedLocale,
          mode: colorMode,
          currentUrl: window.location.href,
        },
      })
      if (url) popup.open({ url, title: direction === FiatRampAction.Buy ? 'Buy' : 'Sell' })
    },
    [
      assets,
      buyFiatCurrency,
      colorMode,
      popup,
      selectedLocale,
      sellFiatCurrency,
      direction,
      manualReceiveAddress,
      walletReceiveAddress,
      selectedQuote?.provider,
      selectedQuote?.amount,
      sellAmountCryptoPrecision,
      buyFiatAmount,
      isConnected,
      buyAccountMetadata,
      buyAsset,
      sellAsset,
    ],
  )

  const bodyContent = useMemo(
    () => (
      <FiatRampTradeBody
        direction={direction}
        onSellAssetChange={handleSellAssetChange}
        onBuyAssetChange={handleBuyAssetChange}
        onSellAmountChange={handleSellAmountChange}
        onBuyFiatAmountChange={handleBuyFiatAmountChange}
        onSellFiatChange={handleSellFiatChange}
        onBuyFiatChange={handleBuyFiatChange}
        onToggleIsInputtingFiatSellAmount={handleIsInputtingFiatSellAmountChange}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        buyAsset={buyAsset}
        sellAsset={sellAsset}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision ?? '0'}
        buyAmountCryptoPrecision={selectedQuote?.amount ?? '0'}
        sellFiatAmount={selectedQuote?.amount ?? '0'}
        buyFiatAmount={buyFiatAmount}
        isLoading={isFetchingQuotes}
      />
    ),
    [
      direction,
      handleSellAssetChange,
      handleBuyAssetChange,
      handleSellAmountChange,
      handleSellFiatChange,
      handleBuyFiatChange,
      handleIsInputtingFiatSellAmountChange,
      isInputtingFiatSellAmount,
      buyAsset,
      sellAsset,
      sellAmountCryptoPrecision,
      buyFiatAmount,
      handleBuyFiatAmountChange,
      selectedQuote?.amount,
      isFetchingQuotes,
    ],
  )

  const rampIcon = useMemo(() => {
    return <AssetIcon src={selectedQuote?.providerLogo} />
  }, [selectedQuote?.providerLogo])

  const rateValue = useMemo(() => {
    if (!selectedQuote?.rate) return '1'

    // For buy operations, invert the rate to show "1 BTC = $X" instead of "1 USD = X BTC"
    if (direction === FiatRampAction.Buy) {
      const rate = bnOrZero(selectedQuote.rate)
      if (rate.isZero()) return '1'
      return bnOrZero(1).div(rate).toString()
    }

    return selectedQuote.rate
  }, [selectedQuote?.rate, direction])

  const footerContent = useMemo(() => {
    const baseProps = {
      affiliateBps: '0',
      affiliateFeeAfterDiscountUserCurrency: '0',
      hasUserEnteredAmount,
      isError: false,
      isLoading: isFetchingQuotes,
      rate: rateValue,
      shouldDisablePreviewButton:
        !hasUserEnteredAmount ||
        (!sellAsset && !sellFiatCurrency) ||
        (!buyAsset && !buyFiatCurrency) ||
        !selectedQuote,
      networkFeeFiatUserCurrency: selectedQuote?.networkFee ?? '0',
      quoteStatusTranslation:
        direction === FiatRampAction.Buy ? 'fiatRamps.previewPurchase' : 'fiatRamps.previewSale',
      noExpand: true,
      invertRate: false,
      onOpenQuoteList: () => {
        navigate(
          direction === FiatRampAction.Buy
            ? FiatRampRoutePaths.BuyQuoteList
            : FiatRampRoutePaths.SellQuoteList,
        )
      },
    }

    if (direction === FiatRampAction.Buy) {
      if (!buyAsset) return null

      return (
        <FiatRampTradeFooter
          {...baseProps}
          direction={FiatRampAction.Buy}
          buyAsset={buyAsset}
          icon={rampIcon}
        />
      )
    }

    if (!sellAsset) return null

    return (
      <FiatRampTradeFooter
        {...baseProps}
        direction={FiatRampAction.Sell}
        sellAsset={sellAsset}
        sellAccountId={undefined}
        icon={rampIcon}
      />
    )
  }, [
    direction,
    sellAsset,
    buyAsset,
    sellFiatCurrency,
    buyFiatCurrency,
    selectedQuote,
    hasUserEnteredAmount,
    rampIcon,
    isFetchingQuotes,
    rateValue,
    navigate,
  ])

  const tradeInputElement = useMemo(
    () => (
      <SharedTradeInput
        onChangeTab={onChangeTab}
        bodyContent={bodyContent}
        footerContent={footerContent}
        headerRightContent={<></>}
        isCompact={false}
        isLoading={isFetchingQuotes}
        SideComponent={SideComponent}
        shouldOpenSideComponent={Boolean(
          direction === FiatRampAction.Buy
            ? bnOrZero(buyFiatAmount).gt(0)
            : bnOrZero(sellAmountCryptoPrecision).gt(0),
        )}
        tradeInputTab={
          direction === FiatRampAction.Buy ? TradeInputTab.BuyFiat : TradeInputTab.SellFiat
        }
        tradeInputRef={tradeInputRef}
        onSubmit={handleSubmit}
      />
    ),
    [
      onChangeTab,
      bodyContent,
      footerContent,
      SideComponent,
      direction,
      handleSubmit,
      sellAmountCryptoPrecision,
      buyFiatAmount,
      isFetchingQuotes,
    ],
  )

  const quoteListComponent = useCallback(
    (props: QuoteListProps) => (
      <QuoteList
        {...props}
        QuotesComponent={RampQuotesComponent}
        showQuoteRefreshCountdown={true}
        showSortBy={false}
        QuoteTimerComponent={FiatRampQuoteTimerComponent}
      />
    ),
    [RampQuotesComponent, FiatRampQuoteTimerComponent],
  )

  const quoteListElement = useMemo(
    () => (
      <SlideTransitionRoute
        height={tradeInputRef.current?.offsetHeight ?? '660px'}
        width={tradeInputRef.current?.offsetWidth ?? 'full'}
        component={quoteListComponent}
        parentRoute={
          direction === FiatRampAction.Buy ? FiatRampRoutePaths.Buy : FiatRampRoutePaths.Sell
        }
      />
    ),
    [quoteListComponent, direction],
  )

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Routes>
        <Route path='buy/quotes' element={quoteListElement} />
        <Route path='sell/quotes' element={quoteListElement} />
        <Route path='*' element={tradeInputElement} />
      </Routes>
    </AnimatePresence>
  )
})

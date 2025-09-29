import { useColorMode } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Route, Routes } from 'react-router-dom'

import { FiatRampRoutePaths } from './types'

import OnRamperLogo from '@/assets/onramper-logo.svg'
import { AssetIcon } from '@/components/AssetIcon'
import { supportedFiatRamps } from '@/components/Modals/FiatRamps/config'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatRampTradeBody } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeBody'
import { FiatRampTradeFooter } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeFooter'
import { useGetRampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/hooks/useGetRampQuotes'
import { RampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/RampQuotes'
import type { QuotesComponentProps } from '@/components/MultiHopTrade/components/QuoteList/QuoteList'
import { SharedTradeInput } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedTradeInput'
import type { CollapsibleQuoteListProps } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { CollapsibleQuoteList } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { marketApi, marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssets } from '@/state/slices/selectors'
import {
  selectBuyAccountId,
  selectBuyFiatCurrency,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectManualReceiveAddress,
  selectSelectedFiatRampQuote,
  selectSellFiatAmount,
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

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const sellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)
  const sellFiatAmount = useAppSelector(selectSellFiatAmount)
  const selectedQuote = useAppSelector(selectSelectedFiatRampQuote)
  const buyAccountId = useAppSelector(selectBuyAccountId)

  const assets = useAppSelector(selectAssets)
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const { colorMode } = useColorMode()
  const popup = useModal('popup')

  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const fiatMarketData = useAppSelector(marketData.selectors.selectFiatMarketData)

  const walletReceiveAddress = useMemo(() => {
    return buyAccountId ? fromAccountId(buyAccountId).account : undefined
  }, [buyAccountId])

  const RampQuotesComponent = useCallback(
    (props: QuotesComponentProps) => {
      return <RampQuotes direction={direction} {...props} />
    },
    [direction],
  )

  const SideComponent = useCallback(
    (props: CollapsibleQuoteListProps) => {
      return (
        <CollapsibleQuoteList
          QuotesComponent={RampQuotesComponent}
          showQuoteRefreshCountdown={false}
          {...props}
        />
      )
    },
    [RampQuotesComponent],
  )

  const handleSellAssetChange = useCallback(
    (asset: Asset | null) => {
      if (asset) {
        dispatch(tradeRampInput.actions.setSellAsset(asset))
      }
    },
    [dispatch],
  )

  const handleBuyAssetChange = useCallback(
    (asset: Asset | null) => {
      if (asset) {
        dispatch(tradeRampInput.actions.setBuyAsset(asset))
      }
    },
    [dispatch],
  )

  const handleSellFiatChange = useCallback(
    (fiat: FiatCurrencyItem | null) => {
      if (fiat) {
        dispatch(tradeRampInput.actions.setSellFiatAsset(fiat))
      }
    },
    [dispatch],
  )

  const handleBuyFiatChange = useCallback(
    (fiat: FiatCurrencyItem | null) => {
      if (fiat) {
        dispatch(tradeRampInput.actions.setBuyFiatAsset(fiat))
      }
    },
    [dispatch],
  )

  const handleSellAmountChange = useCallback(
    (amount: string) => {
      dispatch(tradeRampInput.actions.setSellAmountCryptoPrecision(amount))
    },
    [dispatch],
  )

  const handleSellFiatAmountChange = useCallback(
    (amount: string) => {
      dispatch(tradeRampInput.actions.setSellFiatAmount(amount))
    },
    [dispatch],
  )

  const quotesQueries = useGetRampQuotes({
    fiatCurrency: direction === FiatRampAction.Buy ? sellFiatCurrency : buyFiatCurrency,
    assetId: direction === FiatRampAction.Buy ? buyAsset.assetId : sellAsset.assetId,
    amount: direction === FiatRampAction.Buy ? sellFiatAmount : sellAmountCryptoPrecision,
    direction,
  })

  const isFetchingQuotes = useMemo(() => {
    return quotesQueries.some(query => query.isLoading)
  }, [quotesQueries])

  const debouncedSellAmount = useDebounce(
    direction === FiatRampAction.Buy ? sellFiatAmount : sellAmountCryptoPrecision,
    1000,
  )

  useEffect(() => {
    dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(null))
  }, [debouncedSellAmount, dispatch])

  useEffect(() => {
    dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(null))
    dispatch(tradeRampInput.actions.setSellAmountCryptoPrecision('0'))
    dispatch(tradeRampInput.actions.setSellFiatAmount('0'))
  }, [direction, dispatch])

  useEffect(() => {
    if (!fiatMarketData[buyFiatCurrency?.code]) {
      dispatch(
        marketApi.endpoints.findByFiatSymbol.initiate({
          symbol: buyFiatCurrency?.code,
        }),
      )
    }
  }, [dispatch, buyFiatCurrency?.code, fiatMarketData])

  const handleSubmit = useCallback(async () => {
    if (!selectedQuote?.provider) return

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
      fiatCurrency: direction === FiatRampAction.Buy ? sellFiatCurrency.code : buyFiatCurrency.code,
      fiatAmount: direction === FiatRampAction.Buy ? sellFiatAmount : undefined,
      amountCryptoPrecision:
        direction === FiatRampAction.Sell ? sellAmountCryptoPrecision : undefined,
      options: {
        language: selectedLocale,
        mode: colorMode,
        currentUrl: window.location.href,
      },
    })
    if (url) popup.open({ url, title: direction === FiatRampAction.Buy ? 'Buy' : 'Sell' })
  }, [
    assets,
    buyAsset?.assetId,
    buyFiatCurrency,
    colorMode,
    popup,
    selectedLocale,
    sellAsset?.assetId,
    sellFiatCurrency,
    direction,
    manualReceiveAddress,
    walletReceiveAddress,
    selectedQuote?.provider,
    sellAmountCryptoPrecision,
    sellFiatAmount,
  ])

  const bodyContent = useMemo(
    () => (
      <FiatRampTradeBody
        direction={direction}
        onSellAssetChange={handleSellAssetChange}
        onBuyAssetChange={handleBuyAssetChange}
        onSellAmountChange={handleSellAmountChange}
        onSellFiatChange={handleSellFiatChange}
        onBuyFiatChange={handleBuyFiatChange}
        onSellFiatAmountChange={handleSellFiatAmountChange}
        buyAsset={buyAsset}
        sellAsset={sellAsset}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        buyAmount={selectedQuote?.amount ?? '0'}
        sellFiatAmount={sellFiatAmount}
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
      handleSellFiatAmountChange,
      buyAsset,
      sellAsset,
      sellAmountCryptoPrecision,
      sellFiatAmount,
      selectedQuote?.amount,
      isFetchingQuotes,
    ],
  )

  const rampIcon = useMemo(() => {
    return <AssetIcon src={OnRamperLogo} />
  }, [])

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
        (!buyAsset && !buyFiatCurrency),
      networkFeeFiatUserCurrency: selectedQuote?.networkFee ?? '0',
      quoteStatusTranslation: 'trade.previewTrade',
      noExpand: true,
      invertRate: false,
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
    hasUserEnteredAmount,
    rampIcon,
    isFetchingQuotes,
    rateValue,
    selectedQuote?.networkFee,
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
            ? bnOrZero(sellFiatAmount).gt(0)
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
      sellFiatAmount,
      isFetchingQuotes,
    ],
  )

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Routes>
        <Route key={FiatRampRoutePaths.Buy} path={'*'} element={tradeInputElement} />
        <Route path='/ramp/*' element={tradeInputElement} />
      </Routes>
    </AnimatePresence>
  )
})

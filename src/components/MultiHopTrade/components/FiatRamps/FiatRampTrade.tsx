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
import type { FiatCurrencyItem } from '@/components/Modals/FiatRamps/config'
import { fiatCurrencyObjectsByCode, supportedFiatRamps } from '@/components/Modals/FiatRamps/config'
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
import { FiatTypeEnum } from '@/constants/FiatTypeEnum'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssets } from '@/state/slices/selectors'
import {
  selectBuyAccountId,
  selectBuyFiatAsset,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectManualReceiveAddress,
  selectSelectedFiatRampQuote,
  selectSellFiatAmount,
  selectSellFiatAsset,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type FiatRampTradeProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
  type: FiatRampAction
  onChangeTab: (newTab: TradeInputTab) => void
}

export const FiatRampTrade = memo(({ onChangeTab, type }: FiatRampTradeProps) => {
  const methods = useForm({ mode: 'onChange' })

  return (
    <FormProvider {...methods}>
      <RampRoutes onChangeTab={onChangeTab} type={type} />
    </FormProvider>
  )
})

type RampRoutesProps = {
  isCompact?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
  type: FiatRampAction
}

const RampRoutes = memo(({ onChangeTab, type }: RampRoutesProps) => {
  const tradeInputRef = useRef<HTMLDivElement | null>(null)
  const dispatch = useAppDispatch()

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmount = useAppSelector(selectInputSellAmountCryptoPrecision)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const maybeSellFiat = useAppSelector(selectSellFiatAsset)
  const maybeBuyFiat = useAppSelector(selectBuyFiatAsset)
  const sellFiatAmount = useAppSelector(selectSellFiatAmount)
  const selectedQuote = useAppSelector(selectSelectedFiatRampQuote)
  const buyAccountId = useAppSelector(selectBuyAccountId)

  const sellFiat = maybeSellFiat ?? fiatCurrencyObjectsByCode[FiatTypeEnum.USD]
  const buyFiat = maybeBuyFiat ?? fiatCurrencyObjectsByCode[FiatTypeEnum.USD]

  const assets = useAppSelector(selectAssets)
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const { colorMode } = useColorMode()
  const popup = useModal('popup')
  const selectedCurrencyCode = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const selectedCurrency = fiatCurrencyObjectsByCode[selectedCurrencyCode]

  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const walletReceiveAddress = useMemo(() => {
    return buyAccountId ? fromAccountId(buyAccountId).account : undefined
  }, [buyAccountId])

  useEffect(() => {
    if (!maybeSellFiat) {
      dispatch(tradeRampInput.actions.setSellFiatAsset(selectedCurrency))
    }
    if (!maybeBuyFiat) {
      dispatch(tradeRampInput.actions.setBuyFiatAsset(selectedCurrency))
    }
  }, [maybeSellFiat, maybeBuyFiat, dispatch, selectedCurrency])

  const RampQuotesComponent = useCallback(
    (props: QuotesComponentProps) => {
      return <RampQuotes direction={type} {...props} />
    },
    [type],
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
    fiat: type === FiatRampAction.Buy ? sellFiat : buyFiat,
    assetId: type === FiatRampAction.Buy ? buyAsset.assetId : sellAsset.assetId,
    amount: type === FiatRampAction.Buy ? sellFiatAmount : sellAmount,
    direction: type,
  })

  const isFetchingQuotes = useMemo(() => {
    return quotesQueries.some(query => query.isLoading)
  }, [quotesQueries])

  const debouncedSellAmount = useDebounce(
    type === FiatRampAction.Buy ? sellFiatAmount : sellAmount,
    1000,
  )

  useEffect(() => {
    dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(null))
  }, [debouncedSellAmount, dispatch])

  useEffect(() => {
    dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(null))
    dispatch(tradeRampInput.actions.setSellAmountCryptoPrecision('0'))
    dispatch(tradeRampInput.actions.setSellFiatAmount('0'))
  }, [type, dispatch])

  const handleSubmit = useCallback(async () => {
    if (!selectedQuote?.provider) return

    const ramp = supportedFiatRamps[selectedQuote.provider]
    const mpData = {
      action: type,
      assetId: getMaybeCompositeAssetSymbol(
        type === FiatRampAction.Buy ? buyAsset?.assetId ?? '' : sellAsset?.assetId ?? '',
        assets,
      ),
      ramp: ramp.id,
    }
    getMixPanel()?.track(MixPanelEvent.FiatRamp, mpData)
    const url = await ramp.onSubmit({
      action: type,
      assetId: type === FiatRampAction.Buy ? buyAsset?.assetId ?? '' : sellAsset?.assetId ?? '',
      address: manualReceiveAddress ?? walletReceiveAddress ?? '',
      fiatCurrency: type === FiatRampAction.Buy ? sellFiat.code : buyFiat.code,
      fiatAmount: type === FiatRampAction.Buy ? sellFiatAmount : undefined,
      cryptoAmount: type === FiatRampAction.Sell ? sellAmount : undefined,
      options: {
        language: selectedLocale,
        mode: colorMode,
        currentUrl: window.location.href,
      },
    })
    if (url) popup.open({ url, title: 'Buy' })
  }, [
    assets,
    buyAsset?.assetId,
    buyFiat,
    colorMode,
    popup,
    selectedLocale,
    sellAsset?.assetId,
    sellFiat,
    type,
    manualReceiveAddress,
    walletReceiveAddress,
    selectedQuote?.provider,
    sellAmount,
    sellFiatAmount,
  ])

  const bodyContent = useMemo(
    () => (
      <FiatRampTradeBody
        type={type}
        onSellAssetChange={handleSellAssetChange}
        onBuyAssetChange={handleBuyAssetChange}
        onSellAmountChange={handleSellAmountChange}
        onSellFiatChange={handleSellFiatChange}
        onBuyFiatChange={handleBuyFiatChange}
        onSellFiatAmountChange={handleSellFiatAmountChange}
        buyAsset={buyAsset}
        sellAsset={sellAsset}
        sellAmount={sellAmount}
        buyAmount={selectedQuote?.amount ?? '0'}
        sellFiatAmount={sellFiatAmount}
        isLoading={isFetchingQuotes}
      />
    ),
    [
      type,
      handleSellAssetChange,
      handleBuyAssetChange,
      handleSellAmountChange,
      handleSellFiatChange,
      handleBuyFiatChange,
      handleSellFiatAmountChange,
      buyAsset,
      sellAsset,
      sellAmount,
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
    if (type === FiatRampAction.Buy) {
      const rate = bnOrZero(selectedQuote.rate)
      if (rate.isZero()) return '1'
      return bnOrZero(1).div(rate).toString()
    }

    return selectedQuote.rate
  }, [selectedQuote?.rate, type])

  const footerContent = useMemo(() => {
    const baseProps = {
      affiliateBps: '0',
      affiliateFeeAfterDiscountUserCurrency: '0',
      hasUserEnteredAmount,
      isError: false,
      isLoading: isFetchingQuotes,
      rate: rateValue,
      shouldDisablePreviewButton:
        !hasUserEnteredAmount || (!sellAsset && !sellFiat) || (!buyAsset && !buyFiat),
      rampName: undefined,
      networkFeeFiatUserCurrency: selectedQuote?.networkFee ?? '0',
      quoteStatusTranslation: 'trade.previewTrade',
      noExpand: true,
      invertRate: false,
    }

    if (type === FiatRampAction.Buy) {
      if (!buyAsset) return null

      return (
        <FiatRampTradeFooter
          {...baseProps}
          type={FiatRampAction.Buy}
          buyAsset={buyAsset}
          icon={rampIcon}
        />
      )
    }

    if (!sellAsset) return null

    return (
      <FiatRampTradeFooter
        {...baseProps}
        type={FiatRampAction.Sell}
        sellAsset={sellAsset}
        sellAccountId={undefined}
        icon={rampIcon}
      />
    )
  }, [
    type,
    sellAsset,
    buyAsset,
    sellFiat,
    buyFiat,
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
          type === 'buy'
            ? sellFiatAmount && sellFiatAmount !== '0'
            : sellAmount && sellAmount !== '0',
        )}
        tradeInputTab={type === FiatRampAction.Buy ? TradeInputTab.BuyFiat : TradeInputTab.SellFiat}
        tradeInputRef={tradeInputRef}
        onSubmit={handleSubmit}
      />
    ),
    [
      onChangeTab,
      bodyContent,
      footerContent,
      SideComponent,
      type,
      handleSubmit,
      sellAmount,
      sellFiatAmount,
      isFetchingQuotes,
    ],
  )

  return (
    <>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route key={FiatRampRoutePaths.Buy} path={'*'} element={tradeInputElement} />
          <Route path='/ramp/*' element={tradeInputElement} />
        </Routes>
      </AnimatePresence>
    </>
  )
})

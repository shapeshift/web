import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Route, Routes } from 'react-router-dom'

import { FiatRampRoutePaths } from './types'

import OnRamperLogo from '@/assets/onramper-logo.svg'
import { AssetIcon } from '@/components/AssetIcon'
import type { CommonFiatCurrencies } from '@/components/Modals/FiatRamps/config'
import { FiatRampTradeBody } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeBody'
import { FiatRampTradeFooter } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeFooter'
import { RampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/RampQuotes'
import type { QuotesComponentProps } from '@/components/MultiHopTrade/components/QuoteList/QuoteList'
import { SharedTradeInput } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedTradeInput'
import type { CollapsibleQuoteListProps } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { CollapsibleQuoteList } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import {
  selectBuyFiatAsset,
  selectCalculatedBuyAmount,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectSellFiatAmount,
  selectSellFiatAsset,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type FiatRampTradeProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
  type: 'buy' | 'sell'
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
  type: 'buy' | 'sell'
}

const RampRoutes = memo(({ onChangeTab, type }: RampRoutesProps) => {
  const tradeInputRef = useRef<HTMLDivElement | null>(null)
  const dispatch = useAppDispatch()

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmount = useAppSelector(selectInputSellAmountCryptoPrecision)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const sellFiat = useAppSelector(selectSellFiatAsset)
  const buyFiat = useAppSelector(selectBuyFiatAsset)
  const sellFiatAmount = useAppSelector(selectSellFiatAmount)
  const calculatedBuyAmount = useAppSelector(selectCalculatedBuyAmount)

  const RampQuotesComponent = useCallback(
    (props: QuotesComponentProps) => {
      return <RampQuotes direction={type} {...props} />
    },
    [type],
  )

  const SideComponent = useCallback(
    (props: CollapsibleQuoteListProps) => {
      return <CollapsibleQuoteList QuotesComponent={RampQuotesComponent} {...props} />
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
    (fiat: CommonFiatCurrencies | null) => {
      if (fiat) {
        dispatch(tradeRampInput.actions.setSellFiatAsset(fiat))
      }
    },
    [dispatch],
  )

  const handleBuyFiatChange = useCallback(
    (fiat: CommonFiatCurrencies | null) => {
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

  useEffect(() => {
    return () => {
      dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(null))
    }
  }, [dispatch])

  const handleSubmit = useCallback(() => {
    console.log('submit')
  }, [])

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
        buyAmount={calculatedBuyAmount}
        sellFiatAmount={sellFiatAmount}
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
      calculatedBuyAmount,
    ],
  )

  const rampIcon = useMemo(() => {
    return <AssetIcon src={OnRamperLogo} />
  }, [])

  const footerContent = useMemo(() => {
    // @TODO: wire up that when quote selection is done
    const baseProps = {
      affiliateBps: '0',
      affiliateFeeAfterDiscountUserCurrency: '0',
      hasUserEnteredAmount,
      inputAmountUsd: '0',
      isError: false,
      isLoading: false,
      rate: '1',
      shouldDisablePreviewButton:
        !hasUserEnteredAmount || (!sellAsset && !sellFiat) || (!buyAsset && !buyFiat),
      rampName: undefined,
      networkFeeFiatUserCurrency: '0',
      quoteStatusTranslation: 'trade.previewTrade',
      // @TODO: we might want to expand to show more info at some point
      noExpand: true,
    }

    if (type === 'buy') {
      if (!buyAsset) return null

      return <FiatRampTradeFooter {...baseProps} type='buy' buyAsset={buyAsset} icon={rampIcon} />
    }

    if (!sellAsset) return null

    return (
      <FiatRampTradeFooter
        {...baseProps}
        type='sell'
        sellAsset={sellAsset}
        sellAccountId={undefined}
        icon={rampIcon}
      />
    )
  }, [type, sellAsset, buyAsset, sellFiat, buyFiat, hasUserEnteredAmount, rampIcon])

  const tradeInputElement = useMemo(
    () => (
      <SharedTradeInput
        onChangeTab={onChangeTab}
        bodyContent={bodyContent}
        footerContent={footerContent}
        headerRightContent={<></>}
        isCompact={false}
        isLoading={false}
        SideComponent={SideComponent}
        shouldOpenSideComponent={true}
        tradeInputTab={type === 'buy' ? TradeInputTab.BuyFiat : TradeInputTab.SellFiat}
        tradeInputRef={tradeInputRef}
        onSubmit={handleSubmit}
      />
    ),
    [onChangeTab, bodyContent, footerContent, SideComponent, type, handleSubmit],
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

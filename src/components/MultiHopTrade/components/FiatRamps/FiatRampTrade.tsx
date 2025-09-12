import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Route, Routes } from 'react-router-dom'

import { FiatRampRoutePaths } from './types'

import { FiatRampTradeBody } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeBody'
import { FiatRampTradeFooter } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTradeFooter'
import { RampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/RampQuotes'
import { SharedTradeInput } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedTradeInput'
import type { CollapsibleQuoteListProps } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { CollapsibleQuoteList } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import type { FiatTypeEnumWithoutCryptos } from '@/constants/fiats'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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
  const assets = useAppSelector(selectAssets)

  const [sellAsset, setSellAsset] = useState<Asset | null>(assets[btcAssetId] ?? null)
  const [buyAsset, setBuyAsset] = useState<Asset | null>(assets[btcAssetId] ?? null)
  const [sellFiat, setSellFiat] = useState<FiatTypeEnumWithoutCryptos | null>(null)
  const [buyFiat, setBuyFiat] = useState<FiatTypeEnumWithoutCryptos | null>(null)
  const [sellAmount, setSellAmount] = useState('0')
  const [buyAmount, setBuyAmount] = useState('0')
  const [hasUserEnteredAmount, setHasUserEnteredAmount] = useState(false)

  const SideComponent = useCallback((props: CollapsibleQuoteListProps) => {
    return <CollapsibleQuoteList QuotesComponent={RampQuotes} {...props} />
  }, [])

  const handleSellAssetChange = useCallback((asset: Asset | null) => {
    setSellAsset(asset)
  }, [])

  const handleBuyAssetChange = useCallback((asset: Asset | null) => {
    setBuyAsset(asset)
  }, [])

  const handleSellFiatChange = useCallback((fiat: FiatTypeEnumWithoutCryptos | null) => {
    setSellFiat(fiat)
  }, [])

  const handleBuyFiatChange = useCallback((fiat: FiatTypeEnumWithoutCryptos | null) => {
    setBuyFiat(fiat)
  }, [])

  const handleSellAmountChange = useCallback((amount: string) => {
    setSellAmount(amount)
    setHasUserEnteredAmount(amount.length > 0)
  }, [])

  const handleBuyAmountChange = useCallback((amount: string) => {
    setBuyAmount(amount)
    setHasUserEnteredAmount(amount.length > 0)
  }, [])

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
        onBuyAmountChange={handleBuyAmountChange}
        onSellFiatChange={handleSellFiatChange}
        onBuyFiatChange={handleBuyFiatChange}
        buyAsset={buyAsset}
        sellAsset={sellAsset}
        sellAmount={sellAmount}
        buyAmount={buyAmount}
      />
    ),
    [
      type,
      handleSellAssetChange,
      handleBuyAssetChange,
      handleSellAmountChange,
      handleBuyAmountChange,
      handleSellFiatChange,
      handleBuyFiatChange,
      buyAsset,
      sellAsset,
      sellAmount,
      buyAmount,
    ],
  )

  const footerContent = useMemo(() => {
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
      quoteStatusTranslation: 'ramp.previewOrder',
      noExpand: false,
    }

    if (type === 'buy') {
      if (!buyAsset) return null

      return <FiatRampTradeFooter {...baseProps} type='buy' buyAsset={buyAsset} />
    }

    if (!sellAsset) return null

    return (
      <FiatRampTradeFooter
        {...baseProps}
        type='sell'
        sellAsset={sellAsset}
        sellAccountId={undefined}
      />
    )
  }, [type, sellAsset, buyAsset, sellFiat, buyFiat, hasUserEnteredAmount])

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

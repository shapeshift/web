import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Route, Routes } from 'react-router-dom'

import { FiatRampRoutePaths } from './types'

import { RampQuotes } from '@/components/MultiHopTrade/components/FiatRamps/RampQuotes'
import { SharedTradeInput } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedTradeInput'
import type { CollapsibleQuoteListProps } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { CollapsibleQuoteList } from '@/components/MultiHopTrade/components/TradeInput/components/CollapsibleQuoteList'
import { TradeInputTab } from '@/components/MultiHopTrade/types'

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

  const SideComponent = useCallback((props: CollapsibleQuoteListProps) => {
    return <CollapsibleQuoteList QuotesComponent={RampQuotes} {...props} />
  }, [])

  const tradeInputElement = useMemo(
    () => (
      <SharedTradeInput
        onChangeTab={onChangeTab}
        bodyContent={<>test</>}
        footerContent={<></>}
        headerRightContent={<></>}
        isCompact={false}
        isLoading={false}
        SideComponent={SideComponent}
        shouldOpenSideComponent={true}
        tradeInputTab={type === 'buy' ? TradeInputTab.BuyFiat : TradeInputTab.SellFiat}
        tradeInputRef={tradeInputRef}
        onSubmit={() => {}}
      />
    ),
    [onChangeTab, type, SideComponent],
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

import { skipToken } from '@reduxjs/toolkit/query'
import type { SwapperName, TradeRate } from '@shapeshiftoss/swapper'
import { isThorTradeRate } from '@shapeshiftoss/swapper'
import { useEffect, useRef } from 'react'

import { useGetTradeRateInput } from '../useGetTradeRateInput'

import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { selectIsBatchTradeRateQueryLoading } from '@/state/apis/swapper/selectors'
import { useGetTradeRatesQuery } from '@/state/apis/swapper/swapperApi'
import type { ApiQuote, TradeQuoteError } from '@/state/apis/swapper/types'
import { selectAssets } from '@/state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountUsd,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuoteMetaOrDefault,
  selectSortedTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type MixPanelQuoteMeta = {
  swapperName: SwapperName
  quoteReceived: boolean
  isStreaming: boolean
  isLongtail: boolean
  errors: TradeQuoteError[]
  isActionable: boolean // is the individual quote actionable
}

type GetMixPanelDataFromApiQuotesReturn = {
  quoteMeta: MixPanelQuoteMeta[]
  sellAsset: string
  buyAsset: string
  sellAssetChainId: string
  buyAssetChainId: string
  sellAmountUsd: string | undefined
  version: string // ISO 8601 standard basic format date
  isActionable: boolean // is any quote in the request actionable
}

const getMixPanelDataFromApiRates = (
  quotes: Pick<ApiQuote, 'quote' | 'errors' | 'swapperName' | 'inputOutputRatio'>[],
): GetMixPanelDataFromApiQuotesReturn => {
  const state = store.getState()
  const { assetId: sellAssetId, chainId: sellAssetChainId } = selectInputSellAsset(state)
  const { assetId: buyAssetId, chainId: buyAssetChainId } = selectInputBuyAsset(state)

  const assets = selectAssets(state)

  const compositeSellAssetId = getMaybeCompositeAssetSymbol(sellAssetId, assets)
  const compositeBuyAssetId = getMaybeCompositeAssetSymbol(buyAssetId, assets)

  const sellAmountUsd = selectInputSellAmountUsd(state)
  const quoteMeta: MixPanelQuoteMeta[] = quotes
    .map(({ quote: _quote, errors, swapperName }) => {
      const quote = _quote as TradeRate

      return {
        swapperName,
        quoteReceived: !!quote,
        isStreaming: quote?.isStreaming ?? false,
        isLongtail: quote?.isLongtail ?? false,
        tradeType: isThorTradeRate(quote) ? quote?.tradeType : null,
        errors: errors.map(({ error }) => error),
        isActionable: !!quote && !errors.length,
      }
    })
    .filter(isSome)

  const isActionable = quoteMeta.some(({ isActionable }) => isActionable)

  // Add a version string, in the form of an ISO 8601 standard basic format date, to the JSON blob to help with reporting
  const version = '20240115'

  return {
    quoteMeta,
    sellAsset: compositeSellAssetId,
    buyAsset: compositeBuyAssetId,
    sellAmountUsd,
    sellAssetChainId,
    buyAssetChainId,
    version,
    isActionable,
  }
}

export const useGetTradeRates = () => {
  const dispatch = useAppDispatch()

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)

  const mixpanel = getMixPanel()

  const tradeRateInput = useGetTradeRateInput({
    shouldClearQuoteSlice: true,
    queryKeys: ['useGetTradeRates'],
  })

  const { data: batchTradeRates } = useGetTradeRatesQuery(tradeRateInput ?? skipToken)

  const isBatchTradeRatesLoading = useAppSelector(selectIsBatchTradeRateQueryLoading)

  // Dispatch batch results to Redux when they arrive
  useEffect(() => {
    if (batchTradeRates) {
      console.log('[Trade Rates] Batch rates received:', {
        swappers: Array.isArray(batchTradeRates)
          ? batchTradeRates.map(rate => ({
              swapperName: rate.swapperName,
              hasQuote: !!rate.quote,
              errors: rate.errors.length,
              quoteOrRate: rate.quote?.quoteOrRate,
            }))
          : 'Not an array - logging raw object',
        data: !Array.isArray(batchTradeRates) ? batchTradeRates : undefined,
        timestamp: new Date().toISOString(),
      })
      dispatch(tradeQuoteSlice.actions.upsertTradeQuotes(batchTradeRates))
    }
  }, [batchTradeRates, dispatch])

  const hasTrackedInitialRatesReceived = useRef(false)

  // auto-select the best quote once all quotes have arrived
  useEffect(() => {
    // don't override user selection, don't rug users by auto-selecting while results are incoming
    if (activeQuoteMeta) return

    const bestQuote: ApiQuote | undefined = selectSortedTradeQuotes(store.getState())[0]

    // don't auto-select nothing, don't auto-select errored quotes
    if (bestQuote?.quote === undefined || bestQuote.errors.length > 0) {
      return
    }

    dispatch(tradeQuoteSlice.actions.setActiveQuote(bestQuote))
  }, [activeQuoteMeta, dispatch])

  // If the trade input changes, we need to reset the tracking flag
  useEffect(() => {
    hasTrackedInitialRatesReceived.current = false
  }, [tradeRateInput])

  // TODO: move to separate hook so we don't need to pull quote data into here
  useEffect(() => {
    if (isBatchTradeRatesLoading) return
    if (!mixpanel || !sortedTradeQuotes.length) return

    // We only want to fire the RatesReceived event once, not on every quote refresh
    if (!hasTrackedInitialRatesReceived.current) {
      const quoteData = getMixPanelDataFromApiRates(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.RatesReceived, quoteData)
      hasTrackedInitialRatesReceived.current = true
    }
  }, [sortedTradeQuotes, mixpanel, isBatchTradeRatesLoading])
}

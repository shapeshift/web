import type {
  TradeQuote,
} from '@shapeshiftoss/swapper'
import {
	isExecutableTradeQuote,
  isThorTradeQuote,
  SwapperName,
} from '@shapeshiftoss/swapper'

import { isSome } from '@/lib/utils'
import type { ApiQuote, TradeQuoteError } from '@/state/apis/swapper/types'
import {
  selectAssets,
} from '@/state/slices/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountUsd,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import {
	selectActiveQuote,
  selectSortedTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { store, useAppSelector } from '@/state/store'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import mixpanel from 'mixpanel-browser'
import { useRef, useEffect } from 'react'
import { MixPanelEvent } from '@/lib/mixpanel/types'

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

const getMixPanelDataFromApiQuotes = (
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
      const quote = _quote as TradeQuote

      return {
        swapperName,
        quoteReceived: !!quote,
        isStreaming: quote?.isStreaming ?? false,
        isLongtail: quote?.isLongtail ?? false,
        tradeType: isThorTradeQuote(quote) ? quote?.tradeType : null,
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

export const useTrackTradeQuotes = () => {
  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const hasTrackedQuotesRef = useRef(false)
	const activeTrade = useAppSelector(selectActiveQuote)

  useEffect(() => {
		if (!activeTrade) return

    if (mixpanel && sortedTradeQuotes.length > 0 && !hasTrackedQuotesRef.current && activeTrade && isExecutableTradeQuote(activeTrade)) {
      const quoteData = getMixPanelDataFromApiQuotes(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
      hasTrackedQuotesRef.current = true
    }
  }, [
    sortedTradeQuotes,
    mixpanel,
    activeTrade,
  ])
}

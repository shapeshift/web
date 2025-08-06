import { skipToken } from '@reduxjs/toolkit/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeRateInput, SwapperName, TradeRate } from '@shapeshiftoss/swapper'
import { isThorTradeRate } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { useTradeReceiveAddress } from '@/components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { getTradeQuoteOrRateInput } from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteOrRateInput'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { selectIsBatchTradeRateQueryLoading } from '@/state/apis/swapper/selectors'
import { useGetTradeRatesQuery } from '@/state/apis/swapper/swapperApi'
import type { ApiQuote, TradeQuoteError } from '@/state/apis/swapper/types'
import { selectUsdRateByAssetId } from '@/state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectUserSlippagePercentageDecimal,
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
  const {
    state: { wallet },
  } = useWallet()

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

  const userSlippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const sellAccountMetadataFilter = useMemo(
    () => ({
      accountId: sellAccountId,
    }),
    [sellAccountId],
  )

  const buyAccountMetadataFilter = useMemo(
    () => ({
      accountId: buyAccountId,
    }),
    [buyAccountId],
  )

  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountMetadataFilter),
  )
  const receiveAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountMetadataFilter),
  )

  const mixpanel = getMixPanel()

  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const isBuyAssetChainSupported = walletSupportsBuyAssetChain

  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  const { data: tradeRateInput } = useQuery({
    queryKey: [
      'getTradeRateInput',
      {
        buyAsset,
        sellAmountCryptoPrecision,
        sellAsset,
        userSlippageTolerancePercentageDecimal,
        sellAssetUsdRate,
        // TODO(gomes): all the below are what's causing trade input to refentially invalidate on wallet connect
        // We will need to find a way to have our cake and eat it, by ensuring we get bip44 and other addy-related data to
        // referentially invalidate, while ensuring the *initial* connection of a wallet when quotes were gotten without one, doesn't invalidate anything
        sellAccountMetadata,
        receiveAccountMetadata,
        sellAccountId,
        isBuyAssetChainSupported,
        receiveAddress,
      },
    ],
    queryFn: async () => {
      // Clear the slice before asynchronously generating the input and running the request.
      // This is to ensure the initial state change is done synchronously to prevent race conditions
      // and losing sync on loading state etc.
      dispatch(tradeQuoteSlice.actions.clear())

      // Early exit on any invalid state
      if (bnOrZero(sellAmountCryptoPrecision).isZero()) {
        dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
        return null
      }
      const sellAccountNumber = sellAccountMetadata?.bip44Params?.accountNumber

      const affiliateBps = DEFAULT_FEE_BPS

      const updatedTradeRateInput = (await getTradeQuoteOrRateInput({
        sellAsset,
        sellAccountNumber,
        sellAccountType: sellAccountMetadata?.accountType,
        buyAsset,
        wallet: wallet ?? undefined,
        quoteOrRate: 'rate',
        receiveAddress,
        sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
        allowMultiHop: true,
        affiliateBps,
        // Pass in the user's slippage preference if it's set, else let the swapper use its default
        slippageTolerancePercentageDecimal: userSlippageTolerancePercentageDecimal,
        pubKey:
          wallet && isLedger(wallet) && sellAccountId
            ? fromAccountId(sellAccountId).account
            : undefined,
      })) as GetTradeRateInput

      return updatedTradeRateInput
    },
  })

  const { data: batchTradeRates } = useGetTradeRatesQuery(tradeRateInput ?? skipToken)

  const isBatchTradeRatesLoading = useAppSelector(selectIsBatchTradeRateQueryLoading)

  // Dispatch batch results to Redux when they arrive
  useEffect(() => {
    if (batchTradeRates) {
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

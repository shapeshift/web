import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeRateInput } from '@shapeshiftoss/swapper'
import {
  DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import { isThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useTradeReceiveAddress } from 'components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { getTradeQuoteInput } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteInput'
import { useHasFocus } from 'hooks/useHasFocus'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import {
  selectIsSnapshotApiQueriesRejected,
  selectVotingPower,
} from 'state/apis/snapshot/selectors'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { ApiQuote, TradeQuoteError } from 'state/apis/swapper/types'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/portfolioSlice/selectors'
import { selectWalletId } from 'state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuoteMetaOrDefault,
  selectIsAnyTradeQuoteLoading,
  selectSortedTradeQuotes,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import type { UseGetSwapperTradeQuoteOrRateArgs } from './hooks/useGetSwapperTradeQuoteOrRate'
import { useGetSwapperTradeQuoteOrRate } from './hooks/useGetSwapperTradeQuoteOrRate'

type MixPanelQuoteMeta = {
  swapperName: SwapperName
  differenceFromBestQuoteDecimalPercentage: number
  quoteReceived: boolean
  isStreaming: boolean
  isLongtail: boolean
  errors: TradeQuoteError[]
  isActionable: boolean // is the individual quote actionable
}

type GetMixPanelDataFromApiQuotesReturn = {
  quoteMeta: MixPanelQuoteMeta[]
  sellAssetId: string
  buyAssetId: string
  sellAssetChainId: string
  buyAssetChainId: string
  sellAmountUsd: string | undefined
  version: string // ISO 8601 standard basic format date
  isActionable: boolean // is any quote in the request actionable
}

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }
const thorVotingPowerParams: { feeModel: ParameterModel } = { feeModel: 'THORSWAP' }

const getMixPanelDataFromApiQuotes = (
  quotes: Pick<ApiQuote, 'quote' | 'errors' | 'swapperName' | 'inputOutputRatio'>[],
): GetMixPanelDataFromApiQuotesReturn => {
  const bestInputOutputRatio = quotes[0]?.inputOutputRatio
  const state = store.getState()
  const { assetId: sellAssetId, chainId: sellAssetChainId } = selectInputSellAsset(state)
  const { assetId: buyAssetId, chainId: buyAssetChainId } = selectInputBuyAsset(state)
  const sellAmountUsd = selectInputSellAmountUsd(state)
  const quoteMeta: MixPanelQuoteMeta[] = quotes
    .map(({ quote, errors, swapperName, inputOutputRatio }) => {
      const differenceFromBestQuoteDecimalPercentage =
        (inputOutputRatio / bestInputOutputRatio - 1) * -1
      return {
        swapperName,
        differenceFromBestQuoteDecimalPercentage,
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
    sellAssetId,
    buyAssetId,
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
  const walletId = useAppSelector(selectWalletId)

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)

  const hasFocus = useHasFocus()
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)

  const userSlippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const sellAccountMetadataFilter = useMemo(
    () => ({
      accountId: sellAccountId,
    }),
    [sellAccountId],
  )

  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountMetadataFilter),
  )

  const mixpanel = getMixPanel()

  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))

  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const thorVotingPower = useAppSelector(state => selectVotingPower(state, thorVotingPowerParams))

  const shouldRefetchTradeQuotes = useMemo(() => hasFocus, [hasFocus])

  const isSnapshotApiQueriesRejected = useAppSelector(selectIsSnapshotApiQueriesRejected)
  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  const { data: tradeRateInput } = useQuery({
    // TODO(gomes): magic lays here, ensure isConnected does not trigger a refetch
    // Start from the lowest level of dependencies and work our way up to where things do invalidate
    queryKey: [
      'getTradeRateInput',
      {
        buyAsset,
        // sellAccountMetadata,
        sellAmountCryptoPrecision,
        sellAsset,
        // votingPower,
        // thorVotingPower,
        // wallet,
        userSlippageTolerancePercentageDecimal,
        sellAssetUsdRate,
        // sellAccountId,
        // receiveAddress,
        // isSnapshotApiQueriesRejected,
      },
    ],
    queryFn: async () => {
      // Always invalidate tags when this effect runs - args have changed, and whether we want to fetch an actual quote
      // or a "skipToken" no-op, we always want to ensure that the tags are invalidated before a new query is ran
      // That effectively means we'll unsubscribe to queries, considering them stale
      dispatch(swapperApi.util.invalidateTags(['TradeQuote']))

      // Clear the slice before asynchronously generating the input and running the request.
      // This is to ensure the initial state change is done synchronously to prevent race conditions
      // and losing sync on loading state etc.
      dispatch(tradeQuoteSlice.actions.clear())

      // Early exit on any invalid state
      if (bnOrZero(sellAmountCryptoPrecision).isZero()) {
        dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
        return skipToken
      }
      const sellAccountNumber = sellAccountMetadata?.bip44Params?.accountNumber

      const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(sellAmountCryptoPrecision)

      const { feeBps, feeBpsBeforeDiscount } = calculateFees({
        tradeAmountUsd,
        foxHeld: bnOrZero(votingPower),
        thorHeld: bnOrZero(thorVotingPower),
        feeModel: 'SWAPPER',
        isSnapshotApiQueriesRejected,
      })

      const potentialAffiliateBps = feeBpsBeforeDiscount.toFixed(0)
      const affiliateBps = feeBps.toFixed(0)

      const updatedTradeRateInput = (await getTradeQuoteInput({
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
        potentialAffiliateBps,
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

  const getTradeQuoteArgs = useCallback(
    (swapperName: SwapperName): UseGetSwapperTradeQuoteOrRateArgs => {
      return {
        swapperName,
        tradeQuoteInput: tradeRateInput ?? skipToken,
        skip: !shouldRefetchTradeQuotes,
        pollingInterval:
          swappers[swapperName]?.pollingInterval ?? DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
      }
    },
    [shouldRefetchTradeQuotes, tradeRateInput],
  )

  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.CowSwap))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.ArbitrumBridge))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.Portals))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.LIFI))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.Thorchain))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.Zrx))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.Chainflip))
  useGetSwapperTradeQuoteOrRate(getTradeQuoteArgs(SwapperName.Jupiter))

  // true if any debounce, input or swapper is fetching
  const isAnyTradeQuoteLoading = useAppSelector(selectIsAnyTradeQuoteLoading)

  // auto-select the best quote once all quotes have arrived
  useEffect(() => {
    // don't override user selection, don't rug users by auto-selecting while results are incoming
    if (activeQuoteMeta || isAnyTradeQuoteLoading) return

    const bestQuote: ApiQuote | undefined = selectSortedTradeQuotes(store.getState())[0]

    // don't auto-select nothing, don't auto-select errored quotes
    if (bestQuote?.quote === undefined || bestQuote.errors.length > 0) {
      return
    }

    dispatch(tradeQuoteSlice.actions.setActiveQuote(bestQuote))
  }, [activeQuoteMeta, isAnyTradeQuoteLoading, dispatch])

  // TODO: move to separate hook so we don't need to pull quote data into here
  useEffect(() => {
    if (isAnyTradeQuoteLoading) return
    if (mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
    }
  }, [sortedTradeQuotes, mixpanel, isAnyTradeQuoteLoading])
}

import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import {
  DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import { isThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuoteOrRate/getTradeQuoteOrRate'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTradeReceiveAddress } from 'components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { getTradeQuoteInput } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteInput'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useHasFocus } from 'hooks/useHasFocus'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import {
  selectIsSnapshotApiQueriesPending,
  selectIsSnapshotApiQueriesRejected,
  selectVotingPower,
} from 'state/apis/snapshot/selectors'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { ApiQuote, TradeQuoteError } from 'state/apis/swapper/types'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectPortfolioAccountMetadataByAccountId,
  selectUsdRateByAssetId,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/selectors'
import {
  selectActiveQuoteMetaOrDefault,
  selectIsAnyTradeQuoteLoading,
  selectSortedTradeQuotes,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import type { UseGetSwapperTradeQuoteArgs } from './hooks.tsx/useGetSwapperTradeQuote'
import { useGetSwapperTradeQuote } from './hooks.tsx/useGetSwapperTradeQuote'

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

export const useGetTradeQuotes = () => {
  const dispatch = useAppDispatch()
  const {
    state: { wallet },
  } = useWallet()
  const isPublicTradeRouteEnabled = useFeatureFlag('PublicTradeRoute')
  // TODO(gomes): This is temporary, and we will want to do one better when wiring this up
  const quoteOrRate = isPublicTradeRouteEnabled ? 'rate' : 'quote'
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const hasFocus = useHasFocus()
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const isSnapshotApiQueriesRejected = useAppSelector(selectIsSnapshotApiQueriesRejected)
  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
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

  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const thorVotingPower = useAppSelector(state => selectVotingPower(state, thorVotingPowerParams))
  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const isBuyAssetChainSupported = walletSupportsBuyAssetChain

  const shouldRefetchTradeQuotes = useMemo(
    () =>
      Boolean(
        (hasFocus &&
          wallet &&
          sellAccountId &&
          sellAccountMetadata &&
          receiveAddress &&
          !isVotingPowerLoading) ||
          quoteOrRate === 'rate',
      ),
    [
      hasFocus,
      wallet,
      sellAccountId,
      sellAccountMetadata,
      receiveAddress,
      isVotingPowerLoading,
      quoteOrRate,
    ],
  )

  useEffect(() => {
    // Always invalidate tags when this effect runs - args have changed, and whether we want to fetch an actual quote
    // or a "skipToken" no-op, we always want to ensure that the tags are invalidated before a new query is ran
    // That effectively means we'll unsubscribe to queries, considering them stale
    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))

    // Clear the slice before asynchronously generating the input and running the request.
    // This is to ensure the initial state change is done synchronously to prevent race conditions
    // and losing sync on loading state etc.
    dispatch(tradeQuoteSlice.actions.clear())

    // Early exit on any invalid state
    if (
      bnOrZero(sellAmountCryptoPrecision).isZero() ||
      (quoteOrRate === 'quote' &&
        (!sellAccountId || !sellAccountMetadata || !receiveAddress || isVotingPowerLoading))
    ) {
      setTradeQuoteInput(skipToken)
      dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
      return
    }
    ;(async () => {
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

      if (quoteOrRate === 'quote' && sellAccountNumber === undefined)
        throw new Error('sellAccountNumber is required')
      if (quoteOrRate === 'quote' && !receiveAddress) throw new Error('receiveAddress is required')

      const updatedTradeQuoteInput: GetTradeQuoteInput | undefined = await getTradeQuoteInput({
        sellAsset,
        sellAccountNumber,
        sellAccountType: sellAccountMetadata?.accountType,
        buyAsset,
        wallet: wallet ?? undefined,
        quoteOrRate,
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
      })

      setTradeQuoteInput(updatedTradeQuoteInput)
    })()
  }, [
    buyAsset,
    dispatch,
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    votingPower,
    thorVotingPower,
    wallet,
    receiveAccountMetadata?.bip44Params,
    userSlippageTolerancePercentageDecimal,
    sellAssetUsdRate,
    sellAccountId,
    isVotingPowerLoading,
    isBuyAssetChainSupported,
    quoteOrRate,
    isSnapshotApiQueriesRejected,
  ])

  const getTradeQuoteArgs = useCallback(
    (swapperName: SwapperName): UseGetSwapperTradeQuoteArgs => {
      return {
        swapperName,
        tradeQuoteInput,
        skip: !shouldRefetchTradeQuotes,
        pollingInterval:
          swappers[swapperName]?.pollingInterval ?? DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
      }
    },
    [shouldRefetchTradeQuotes, tradeQuoteInput],
  )

  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.CowSwap))
  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.ArbitrumBridge))
  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.Portals))
  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.LIFI))
  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.Thorchain))
  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.Zrx))
  useGetSwapperTradeQuote(getTradeQuoteArgs(SwapperName.Chainflip))

  // true if any debounce, input or swapper is fetching
  const isAnyTradeQuoteLoading = useAppSelector(selectIsAnyTradeQuoteLoading)

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)

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

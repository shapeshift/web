import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { getTradeQuoteArgs } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteArgs'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import type { ApiQuote, TradeQuoteError } from 'state/apis/swapper'
import { GET_TRADE_QUOTE_POLLING_INTERVAL, swapperApi } from 'state/apis/swapper/swapperApi'
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
  selectActiveQuoteMeta,
  selectSortedTradeQuotes,
  selectTradeQuoteRequestErrors,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import type { SwapperTradeQuoteCommonArgs } from './hooks.tsx/useGetSwapperTradeQuote'
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
  const wallet = useWallet().state.wallet
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const [hasFocus, setHasFocus] = useState(document.hasFocus())
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )
  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const debouncedSellAmountCryptoPrecision = useDebounce(sellAmountCryptoPrecision, 500)
  const isDebouncing = debouncedSellAmountCryptoPrecision !== sellAmountCryptoPrecision

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  // No need to pass a sellAssetAccountId to synchronize the buy account here - by the time this is called, we already have a valid buyAccountId
  const buyAccountId = useAppSelector(state =>
    selectLastHopBuyAccountId(state, { accountId: undefined }),
  )

  const userslippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const sellAccountMetadata = useMemo(() => {
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: sellAccountId,
    })
  }, [sellAccountId])

  const receiveAccountMetadata = useMemo(() => {
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: buyAccountId,
    })
  }, [buyAccountId])

  const mixpanel = getMixPanel()

  const sellAssetUsdRate = useAppSelector(s => selectUsdRateByAssetId(s, sellAsset.assetId))

  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(selectVotingPower)
  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const isSnapInstalled = useIsSnapInstalled()
  const walletSupportsBuyAssetChain = useWalletSupportsChain({
    chainId: buyAsset.chainId,
    wallet,
    isSnapInstalled,
  })
  const isBuyAssetChainSupported = walletSupportsBuyAssetChain

  const shouldRefetchTradeQuotes = useMemo(
    () =>
      Boolean(
        wallet &&
          !isDebouncing &&
          sellAccountId &&
          sellAccountMetadata &&
          receiveAddress &&
          !isVotingPowerLoading,
      ),
    [
      wallet,
      isDebouncing,
      sellAccountId,
      sellAccountMetadata,
      receiveAddress,
      isVotingPowerLoading,
    ],
  )

  useEffect(() => {
    // Early exit on any invalid state
    if (
      bnOrZero(sellAmountCryptoPrecision).isZero() ||
      !wallet ||
      !sellAccountId ||
      !sellAccountMetadata ||
      !receiveAddress ||
      isVotingPowerLoading
    ) {
      setTradeQuoteInput(skipToken)
      dispatch(tradeQuoteSlice.actions.clear())
      dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
      return
    }

    // Don't update tradeQuoteInput while we're still debouncing
    // This needs to happen after checking and aborting invalid state to prevent incorrectly
    // displaying loading state during debouncing
    if (isDebouncing) return

    // Always invalidate tags when this effect runs - args have changed, and whether we want to fetch an actual quote
    // or a "skipToken" no-op, we always want to ensure that the tags are invalidated before a new query is ran
    // That effectively means we'll unsubscribe to queries, considering them stale
    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))

    // Clear the slice before asynchronously generating the input and running the request.
    // This is to ensure the initial state change is done synchronously to prevent race conditions
    // and losing sync on loading state etc.
    dispatch(tradeQuoteSlice.actions.clear())
    ;(async () => {
      const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
      const receiveAssetBip44Params = receiveAccountMetadata?.bip44Params
      const receiveAccountNumber = receiveAssetBip44Params?.accountNumber

      const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(debouncedSellAmountCryptoPrecision)

      const { feeBps, feeBpsBeforeDiscount } = calculateFees({
        tradeAmountUsd,
        foxHeld: votingPower !== undefined ? bn(votingPower) : undefined,
      })

      const potentialAffiliateBps = feeBpsBeforeDiscount.toFixed(0)
      const affiliateBps = feeBps.toFixed(0)

      const updatedTradeQuoteInput: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
        sellAsset,
        sellAccountNumber,
        receiveAccountNumber,
        sellAccountType: sellAccountMetadata.accountType,
        buyAsset,
        wallet,
        receiveAddress,
        sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
        allowMultiHop: true,
        affiliateBps,
        potentialAffiliateBps,
        // Pass in the user's slippage preference if it's set, else let the swapper use its default
        slippageTolerancePercentageDecimal: userslippageTolerancePercentageDecimal,
        pubKey: isLedger(wallet) ? fromAccountId(sellAccountId).account : undefined,
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
    wallet,
    receiveAccountMetadata?.bip44Params,
    userslippageTolerancePercentageDecimal,
    sellAssetUsdRate,
    sellAccountId,
    isVotingPowerLoading,
    isBuyAssetChainSupported,
    debouncedSellAmountCryptoPrecision,
    isDebouncing,
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setHasFocus(document.hasFocus())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const commonTradeQuoteArgs: SwapperTradeQuoteCommonArgs = useMemo(() => {
    const skip = !shouldRefetchTradeQuotes
    const pollingInterval = hasFocus ? GET_TRADE_QUOTE_POLLING_INTERVAL : undefined
    return {
      tradeQuoteInput,
      skip,
      pollingInterval,
    }
  }, [hasFocus, shouldRefetchTradeQuotes, tradeQuoteInput])

  const cowSwapQuoteMeta = useGetSwapperTradeQuote(SwapperName.CowSwap, commonTradeQuoteArgs)
  const oneInchQuoteMeta = useGetSwapperTradeQuote(SwapperName.OneInch, commonTradeQuoteArgs)
  const lifiQuoteMeta = useGetSwapperTradeQuote(SwapperName.LIFI, commonTradeQuoteArgs)
  const thorchainQuoteMeta = useGetSwapperTradeQuote(SwapperName.Thorchain, commonTradeQuoteArgs)
  const zrxQuoteMeta = useGetSwapperTradeQuote(SwapperName.Zrx, commonTradeQuoteArgs)

  const combinedQuoteMeta = useMemo(() => {
    return [cowSwapQuoteMeta, oneInchQuoteMeta, lifiQuoteMeta, thorchainQuoteMeta, zrxQuoteMeta]
  }, [cowSwapQuoteMeta, oneInchQuoteMeta, lifiQuoteMeta, thorchainQuoteMeta, zrxQuoteMeta])

  // cease fetching state when at least 1 response is available
  // more quotes will arrive after, which is intentional.
  const isAnySwapperFetched = useMemo(() => {
    return !isDebouncing && combinedQuoteMeta.some(quoteMeta => !quoteMeta.isFetching)
  }, [combinedQuoteMeta, isDebouncing])

  // true if any debounce, input or swapper is fetching
  const isQuoteRequestIncomplete = useMemo(() => {
    return isDebouncing || combinedQuoteMeta.some(quoteMeta => quoteMeta.isFetching)
  }, [combinedQuoteMeta, isDebouncing])

  const isQuoteRequestUninitialized = useMemo(() => {
    return combinedQuoteMeta.every(quoteMeta => quoteMeta.isUninitialized)
  }, [combinedQuoteMeta])

  const isSwapperFetching: Record<SwapperName, boolean> = useMemo(() => {
    return {
      [SwapperName.CowSwap]: cowSwapQuoteMeta.isFetching,
      [SwapperName.OneInch]: oneInchQuoteMeta.isFetching,
      [SwapperName.LIFI]: lifiQuoteMeta.isFetching,
      [SwapperName.Thorchain]: thorchainQuoteMeta.isFetching,
      [SwapperName.Zrx]: zrxQuoteMeta.isFetching,
      [SwapperName.Test]: false,
    }
  }, [
    cowSwapQuoteMeta.isFetching,
    lifiQuoteMeta.isFetching,
    oneInchQuoteMeta.isFetching,
    thorchainQuoteMeta.isFetching,
    zrxQuoteMeta.isFetching,
  ])

  const allQuotesHaveError = useMemo(() => {
    return combinedQuoteMeta.every(quoteMeta => !!quoteMeta.error)
  }, [combinedQuoteMeta])

  const tradeQuoteRequestErrors = useAppSelector(selectTradeQuoteRequestErrors)

  const didQuoteRequestFail = useMemo(() => {
    return allQuotesHaveError || tradeQuoteRequestErrors.length > 0
  }, [allQuotesHaveError, tradeQuoteRequestErrors.length])

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMeta)

  // auto-select the best quote once all quotes have arrived
  useEffect(() => {
    // don't override user selection, don't rug users by auto-selecting while results are incoming
    if (activeQuoteMeta || isQuoteRequestUninitialized || isQuoteRequestIncomplete) return

    const bestQuote: ApiQuote | undefined = selectSortedTradeQuotes(store.getState())[0]

    // don't auto-select nothing, don't auto-select errored quotes
    if (bestQuote?.quote === undefined || bestQuote.errors.length > 0) {
      return
    }

    dispatch(tradeQuoteSlice.actions.setActiveQuote(bestQuote))
  }, [activeQuoteMeta, isQuoteRequestUninitialized, isQuoteRequestIncomplete, dispatch])

  // TODO: move to separate hook so we don't need to pull quote data into here
  useEffect(() => {
    if (isQuoteRequestIncomplete) return
    if (mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
    }
  }, [sortedTradeQuotes, mixpanel, isQuoteRequestIncomplete])

  return {
    isQuoteRequestUninitialized,
    isAnySwapperFetched,
    isQuoteRequestComplete: !isQuoteRequestIncomplete,
    isSwapperFetching,
    didQuoteRequestFail,
    isQuoteRequestIncomplete,
  }
}

import { skipToken as reduxSkipToken } from '@reduxjs/toolkit/query'
import { foxWifHatAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type {
  GetTradeQuoteInput,
  GetTradeRateInput,
  TradeQuote,
  TradeRate,
} from '@shapeshiftoss/swapper'
import {
  DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  isExecutableTradeQuote,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import { isThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import type { LifiTradeRate } from '@shapeshiftoss/swapper/src/swappers/LifiSwapper/utils/types'
import { skipToken as reactQuerySkipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTradeReceiveAddress } from 'components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { getTradeQuoteOrRateInput } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteOrRateInput'
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
  selectIsSnapshotApiQueriesRejected,
  selectVotingPower,
} from 'state/apis/snapshot/selectors'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { ApiQuote, TradeQuoteError } from 'state/apis/swapper/types'
import {
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectUsdRateByAssetId,
} from 'state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteMetaOrDefault,
  selectConfirmedTradeExecution,
  selectHopExecutionMetadata,
  selectIsAnyTradeQuoteLoading,
  selectSortedTradeQuotes,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
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
    .map(({ quote: _quote, errors, swapperName, inputOutputRatio }) => {
      const quote = _quote as TradeQuote

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

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const activeTrade = useAppSelector(selectActiveQuote)
  const activeTradeId = activeTrade?.id
  const activeRateRef = useRef<TradeQuote | TradeRate | undefined>()
  const activeTradeIdRef = useRef<string | undefined>()
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)
  const activeQuoteMetaRef = useRef<{ swapperName: SwapperName; identifier: string } | undefined>()
  const confirmedTradeExecution = useAppSelector(selectConfirmedTradeExecution)

  useEffect(
    () => {
      activeRateRef.current = activeTrade
      activeTradeIdRef.current = activeTradeId
      activeQuoteMetaRef.current = activeQuoteMeta
    },
    // WARNING: DO NOT SET ANY DEP HERE.
    // We're using this to keep the ref of the rate and matching tradeId for it on mount.
    // This should never update afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!activeTradeId) return undefined

    return {
      tradeId: activeTradeId,
      hopIndex: 0,
    }
  }, [activeTradeId])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
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

  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const thorVotingPower = useAppSelector(state => selectVotingPower(state, thorVotingPowerParams))
  const foxWifHatHeld = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, { assetId: foxWifHatAssetId }),
  )

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const isBuyAssetChainSupported = walletSupportsBuyAssetChain

  // Don't memo me, this is a ref and needs to re-evaluate every-render
  const swapperName = activeQuoteMetaRef.current?.swapperName

  // Is the step we're in a step which requires final quote fetching?
  const isFetchStep = useMemo(() => {
    if (!swapperName) return
    const permit2 = hopExecutionMetadata?.permit2
    // ZRX is the odd one - we either want to fetch the final quote at pre-permit, or pre-swap input, depending on whether permit2 is required or not
    if (swapperName === SwapperName.Zrx)
      return (
        (permit2?.isRequired &&
          permit2?.state === TransactionExecutionState.AwaitingConfirmation) ||
        (!permit2?.isRequired && hopExecutionMetadata?.state === HopExecutionState.AwaitingSwap)
      )
    return (
      hopExecutionMetadata?.state === HopExecutionState.AwaitingSwap &&
      hopExecutionMetadata?.swap?.state === TransactionExecutionState.AwaitingConfirmation
    )
  }, [
    hopExecutionMetadata?.permit2,
    hopExecutionMetadata?.state,
    hopExecutionMetadata?.swap?.state,
    swapperName,
  ])

  const shouldFetchTradeQuotes = useMemo(() => {
    return Boolean(
      hasFocus &&
        // Only fetch quote if the current "quote" is a rate (which we have gotten from input step)
        activeTrade &&
        !isExecutableTradeQuote(activeTrade) &&
        // and if we're actually at pre-execution time
        isFetchStep &&
        sellAccountId &&
        sellAccountMetadata &&
        receiveAddress,
    )
  }, [hasFocus, activeTrade, isFetchStep, sellAccountId, sellAccountMetadata, receiveAddress])

  const queryFnOrSkip = useMemo(() => {
    // Only run this query when we're actually ready
    if (!isFetchStep) return reactQuerySkipToken
    // And only run it once
    if (activeTrade && isExecutableTradeQuote(activeTrade)) return reactQuerySkipToken

    return async () => {
      dispatch(swapperApi.util.invalidateTags(['TradeQuote']))

      const sellAccountNumber = sellAccountMetadata?.bip44Params?.accountNumber

      const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(sellAmountCryptoPrecision)

      const { feeBps, feeBpsBeforeDiscount } = calculateFees({
        tradeAmountUsd,
        foxHeld: bnOrZero(votingPower),
        thorHeld: bnOrZero(thorVotingPower),
        foxWifHatHeldCryptoBaseUnit: bnOrZero(foxWifHatHeld),
        feeModel: 'SWAPPER',
        isSnapshotApiQueriesRejected,
      })

      const potentialAffiliateBps = feeBpsBeforeDiscount.toFixed(0)
      const affiliateBps = feeBps.toFixed(0)

      if (sellAccountNumber === undefined) throw new Error('sellAccountNumber is required')
      if (!receiveAddress) throw new Error('receiveAddress is required')

      const updatedTradeQuoteInput: GetTradeQuoteInput | GetTradeRateInput | undefined =
        await getTradeQuoteOrRateInput({
          sellAsset,
          sellAccountNumber,
          sellAccountType: sellAccountMetadata?.accountType,
          buyAsset,
          wallet: wallet ?? undefined,
          originalRate: activeRateRef?.current as LifiTradeRate,
          quoteOrRate: 'quote',
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

      return updatedTradeQuoteInput
    }
  }, [
    activeTrade,
    buyAsset,
    dispatch,
    isFetchStep,
    isSnapshotApiQueriesRejected,
    receiveAddress,
    sellAccountId,
    sellAccountMetadata?.accountType,
    sellAccountMetadata?.bip44Params?.accountNumber,
    sellAmountCryptoPrecision,
    sellAsset,
    sellAssetUsdRate,
    thorVotingPower,
    foxWifHatHeld,
    userSlippageTolerancePercentageDecimal,
    votingPower,
    wallet,
  ])

  const { data: tradeQuoteInput } = useQuery({
    queryKey: [
      'getTradeQuoteInput',
      {
        buyAsset,
        dispatch,
        receiveAddress,
        sellAccountMetadata,
        sellAmountCryptoPrecision,
        sellAsset,
        votingPower,
        thorVotingPower,
        receiveAccountMetadata,
        userSlippageTolerancePercentageDecimal,
        sellAssetUsdRate,
        sellAccountId,
        isBuyAssetChainSupported,
        hopExecutionMetadata,
        activeTrade,
      },
    ],
    queryFn: queryFnOrSkip,
  })

  const getTradeQuoteArgs = useCallback(
    (swapperName: SwapperName | undefined): UseGetSwapperTradeQuoteOrRateArgs => {
      return {
        swapperName,
        tradeQuoteOrRateInput: tradeQuoteInput ?? reduxSkipToken,
        // Skip trade quotes fetching which aren't for the swapper we have a rate for
        skip: !swapperName || !shouldFetchTradeQuotes,
        pollingInterval:
          swappers[swapperName as SwapperName]?.pollingInterval ??
          DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
      }
    },
    [shouldFetchTradeQuotes, tradeQuoteInput],
  )

  const queryStateMeta = useGetSwapperTradeQuoteOrRate(
    getTradeQuoteArgs(activeQuoteMetaRef.current?.swapperName),
  )

  // true if any debounce, input or swapper is fetching
  const isAnyTradeQuoteLoading = useAppSelector(selectIsAnyTradeQuoteLoading)

  // auto-select the best quote once all quotes have arrived
  useEffect(() => {
    if (!confirmedTradeExecution) return
    // We already have an executable active trade, don't rerun this or this will run forever
    if (activeTrade && isExecutableTradeQuote(activeTrade)) return
    const identifier = activeQuoteMetaRef.current?.identifier
    if (!identifier) return
    if (!queryStateMeta?.data) return
    const quoteData = queryStateMeta.data[identifier]
    if (!quoteData?.quote) return

    // Set the execution metadata to that of the previous rate so we can take over
    dispatch(
      tradeQuoteSlice.actions.setTradeExecutionMetadata({
        id: quoteData.quote.id,
        executionMetadata: confirmedTradeExecution,
      }),
    )
    // Set as both confirmed *and* active
    dispatch(tradeQuoteSlice.actions.setActiveQuote(quoteData))
    dispatch(tradeQuoteSlice.actions.setConfirmedQuote(quoteData.quote))
  }, [activeTrade, activeQuoteMeta, dispatch, queryStateMeta.data, confirmedTradeExecution])

  // TODO: move to separate hook so we don't need to pull quote data into here
  useEffect(() => {
    if (isAnyTradeQuoteLoading) return
    if (mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
    }
  }, [sortedTradeQuotes, mixpanel, isAnyTradeQuoteLoading])

  return queryStateMeta
}

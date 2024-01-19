import { usePrevious } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { isEqual } from 'lodash'
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
import { isSkipToken, isSome } from 'lib/utils'
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
  selectSortedTradeQuotes,
  selectTradeQuoteRequestErrors,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

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

const isEqualExceptAffiliateBpsAndSlippage = (
  a: GetTradeQuoteInput | typeof skipToken,
  b: GetTradeQuoteInput | undefined,
) => {
  if (!isSkipToken(a) && b) {
    const {
      affiliateBps: _affiliateBps,
      slippageTolerancePercentageDecimal: _slippageTolerancePercentageDecimal,
      ...aWithoutAffiliateBpsAndSlippage
    } = a

    const {
      affiliateBps: _updatedAffiliateBps,
      slippageTolerancePercentageDecimal: _updatedSlippageTolerancePercentageDecimal,
      ...bWithoutAffiliateBpsAndSlippage
    } = b

    return isEqual(aWithoutAffiliateBpsAndSlippage, bWithoutAffiliateBpsAndSlippage)
  }
}

export const useGetTradeQuotes = () => {
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const previousTradeQuoteInput = usePrevious(tradeQuoteInput)
  const isTradeQuoteUpdated = tradeQuoteInput !== previousTradeQuoteInput
  const [hasFocus, setHasFocus] = useState(document.hasFocus())
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )
  const receiveAddress = useReceiveAddress(useReceiveAddressArgs)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const debouncedSellAmountCryptoPrecision = useDebounce(sellAmountCryptoPrecision, 500)
  const isDebouncing = debouncedSellAmountCryptoPrecision !== sellAmountCryptoPrecision

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

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
        isTradeQuoteUpdated &&
          wallet &&
          !isDebouncing &&
          sellAccountId &&
          sellAccountMetadata &&
          receiveAddress &&
          !isVotingPowerLoading,
      ),
    [
      isTradeQuoteUpdated,
      wallet,
      isDebouncing,
      sellAccountId,
      sellAccountMetadata,
      receiveAddress,
      isVotingPowerLoading,
    ],
  )

  useEffect(() => {
    // Don't update tradeQuoteInput while we're still debouncing
    if (isDebouncing) return

    // Always invalidate tags when this effect runs - args have changed, and whether we want to fetch an actual quote
    // or a "skipToken" no-op, we always want to ensure that the tags are invalidated before a new query is ran
    // That effectively means we'll unsubscribe to queries, considering them stale
    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))

    if (wallet && sellAccountId && sellAccountMetadata && receiveAddress && !isVotingPowerLoading) {
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

        // if the quote input args changed, reset the selected swapper and update the trade quote args
        if (!isEqual(tradeQuoteInput, updatedTradeQuoteInput ?? skipToken)) {
          updatedTradeQuoteInput && bnOrZero(sellAmountCryptoPrecision).gt(0)
            ? setTradeQuoteInput(updatedTradeQuoteInput)
            : setTradeQuoteInput(skipToken)

          // If only the affiliateBps or the userslippageTolerancePercentageDecimal changed, we've either:
          // - switched swappers where one has a different default slippageTolerancePercentageDecimal
          // In either case, we don't want to reset the selected swapper
          if (isEqualExceptAffiliateBpsAndSlippage(tradeQuoteInput, updatedTradeQuoteInput)) {
            return
          } else {
            dispatch(tradeQuoteSlice.actions.resetActiveQuoteIndex())
          }
        }
      })()
    } else {
      // if the quote input args changed, reset the selected swapper and update the trade quote args
      if (tradeQuoteInput !== skipToken) {
        setTradeQuoteInput(skipToken)
        dispatch(tradeQuoteSlice.actions.resetConfirmedQuote())
        dispatch(tradeQuoteSlice.actions.resetActiveQuoteIndex())
      }
    }
  }, [
    buyAsset,
    dispatch,
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    votingPower,
    tradeQuoteInput,
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

  const skip = !shouldRefetchTradeQuotes
  const pollingInterval = hasFocus ? GET_TRADE_QUOTE_POLLING_INTERVAL : undefined

  const cowSwapQuoteMeta = useGetSwapperTradeQuote(
    SwapperName.CowSwap,
    tradeQuoteInput,
    skip,
    pollingInterval,
  )

  const oneInchQuoteMeta = useGetSwapperTradeQuote(
    SwapperName.OneInch,
    tradeQuoteInput,
    skip,
    pollingInterval,
  )

  const lifiQuoteMeta = useGetSwapperTradeQuote(
    SwapperName.LIFI,
    tradeQuoteInput,
    skip,
    pollingInterval,
  )

  const thorchainQuoteMeta = useGetSwapperTradeQuote(
    SwapperName.Thorchain,
    tradeQuoteInput,
    skip,
    pollingInterval,
  )

  const zrxQuoteMeta = useGetSwapperTradeQuote(
    SwapperName.Zrx,
    tradeQuoteInput,
    skip,
    pollingInterval,
  )

  const combinedQuoteMeta = useMemo(() => {
    return [cowSwapQuoteMeta, oneInchQuoteMeta, lifiQuoteMeta, thorchainQuoteMeta, zrxQuoteMeta]
  }, [cowSwapQuoteMeta, oneInchQuoteMeta, lifiQuoteMeta, thorchainQuoteMeta, zrxQuoteMeta])

  // cease fetching state when at least 1 response is available
  // more quotes will arrive after, which is intentional.
  const isFetching = useMemo(() => {
    return combinedQuoteMeta.every(quoteMeta => quoteMeta.isFetching)
  }, [combinedQuoteMeta])

  const allQuotesHaveError = useMemo(() => {
    return combinedQuoteMeta.every(quoteMeta => !!quoteMeta.error)
  }, [combinedQuoteMeta])

  const tradeQuoteRequestErrors = useAppSelector(selectTradeQuoteRequestErrors)

  const didFail = useMemo(() => {
    return allQuotesHaveError || tradeQuoteRequestErrors.length > 0
  }, [allQuotesHaveError, tradeQuoteRequestErrors.length])

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)

  // TODO: move to separate hook so we don't need to pull quote data into here
  useEffect(() => {
    if (isFetching) return
    if (mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(sortedTradeQuotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
    }
  }, [sortedTradeQuotes, mixpanel, isFetching])

  return { isFetching, didFail }
}

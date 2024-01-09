import { usePrevious } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_SWAPPER_AFFILIATE_BPS } from 'components/MultiHopTrade/constants'
import { getTradeQuoteArgs } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteArgs'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isKeepKeyHDWallet, isSkipToken, isSome } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import type { ApiQuote } from 'state/apis/swappers'
import {
  GET_TRADE_QUOTE_POLLING_INTERVAL,
  swappersApi,
  useGetTradeQuoteQuery,
} from 'state/apis/swappers/swappersApi'
import {
  selectBuyAsset,
  selectFirstHopSellAccountId,
  selectLastHopBuyAccountId,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectUsdRateByAssetId,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/selectors'
import {
  selectFirstHopSellAsset,
  selectLastHopBuyAsset,
  selectSellAmountUsd,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

type MixPanelQuoteMeta = {
  swapperName: SwapperName
  differenceFromBestQuoteDecimalPercentage: number
  quoteReceived: boolean
  isStreaming: boolean
  isLongtail: boolean
}

type GetMixPanelDataFromApiQuotesReturn = {
  quoteMeta: MixPanelQuoteMeta[]
  sellAssetId: string | undefined
  buyAssetId: string | undefined
  sellAmountUsd: string | undefined
  version: string // ISO 8601 standard basic format date
}

const getMixPanelDataFromApiQuotes = (quotes: ApiQuote[]): GetMixPanelDataFromApiQuotesReturn => {
  const bestInputOutputRatio = quotes[0]?.inputOutputRatio
  const sellAssetId = selectFirstHopSellAsset(store.getState())?.assetId
  const buyAssetId = selectLastHopBuyAsset(store.getState())?.assetId
  const sellAmountUsd = selectSellAmountUsd(store.getState())
  const quoteMeta: MixPanelQuoteMeta[] = quotes
    .map(({ quote, swapperName, inputOutputRatio }) => {
      const differenceFromBestQuoteDecimalPercentage =
        (inputOutputRatio / bestInputOutputRatio - 1) * -1
      return {
        swapperName,
        differenceFromBestQuoteDecimalPercentage,
        quoteReceived: !!quote,
        isStreaming: quote?.isStreaming ?? false,
        isLongtail: quote?.isLongtail ?? false,
      }
    })
    .filter(isSome)

  // Add a version string, in the form of an ISO 8601 standard basic format date, to the JSON blob to help with reporting
  const version = '20231220'

  return { quoteMeta, sellAssetId, buyAssetId, sellAmountUsd, version }
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
  const sellAsset = useAppSelector(selectSellAsset)
  const buyAsset = useAppSelector(selectBuyAsset)
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )
  const receiveAddress = useReceiveAddress(useReceiveAddressArgs)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)
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
    dispatch(swappersApi.util.invalidateTags(['TradeQuote']))

    if (wallet && sellAccountId && sellAccountMetadata && receiveAddress && !isVotingPowerLoading) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
        const receiveAssetBip44Params = receiveAccountMetadata?.bip44Params
        const receiveAccountNumber = receiveAssetBip44Params?.accountNumber
        const walletIsKeepKey = wallet && isKeepKeyHDWallet(wallet)

        const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(debouncedSellAmountCryptoPrecision)
        const potentialAffiliateBps = DEFAULT_SWAPPER_AFFILIATE_BPS
        const affiliateBps = (() => {
          // free trades if there's an error getting foxHeld
          if (votingPower === undefined) return '0'

          const affiliateBps = calculateFees({
            tradeAmountUsd,
            foxHeld: bnOrZero(votingPower),
          }).feeBps.toFixed(0)

          return affiliateBps
        })()

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
          isKeepKey: walletIsKeepKey,
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

  // NOTE: we're using currentData here, not data, see https://redux-toolkit.js.org/rtk-query/usage/conditional-fetching
  // This ensures we never return cached data, if skip has been set after the initial query load
  const { currentData } = useGetTradeQuoteQuery(tradeQuoteInput, {
    skip: !shouldRefetchTradeQuotes,
    pollingInterval: hasFocus ? GET_TRADE_QUOTE_POLLING_INTERVAL : undefined,
    /*
      If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
      We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
     */
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    if (currentData && mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(currentData.quotes)
      mixpanel.track(MixPanelEvent.QuotesReceived, quoteData)
    }
  }, [currentData, mixpanel])
}

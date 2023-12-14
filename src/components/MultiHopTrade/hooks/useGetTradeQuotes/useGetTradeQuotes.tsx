import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_SWAPPER_DONATION_BPS } from 'components/MultiHopTrade/constants'
import { getTradeQuoteArgs } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteArgs'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { isKeepKeyHDWallet, isSkipToken, isSome } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import type { ApiQuote } from 'state/apis/swappers'
import { useGetTradeQuoteQuery } from 'state/apis/swappers/swappersApi'
import {
  selectBuyAsset,
  selectFirstHopSellAccountId,
  selectLastHopBuyAccountId,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectUsdRateByAssetId,
  selectUserSlippagePercentageDecimal,
  selectWillDonate,
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
      }
    })
    .filter(isSome)

  // Add a version string, in the form of an ISO 8601 standard basic format date, to the JSON blob to help with reporting
  const version = '20230824'

  return { quoteMeta, sellAssetId, buyAssetId, sellAmountUsd, version }
}

const isEqualExceptAffiliateBpsAndSlippage = (
  a: GetTradeQuoteInput | typeof skipToken,
  b: GetTradeQuoteInput | undefined,
) => {
  if (!isSkipToken(a) && b) {
    const {
      affiliateBps: _affiliateBps,
      slippageTolerancePercentage: _slippageTolerancePercentage,
      ...aWithoutAffiliateBpsAndSlippage
    } = a

    const {
      affiliateBps: _updatedAffiliateBps,
      slippageTolerancePercentage: _updatedSlippageTolerancePercentage,
      ...bWithoutAffiliateBpsAndSlippage
    } = b

    return isEqual(aWithoutAffiliateBpsAndSlippage, bWithoutAffiliateBpsAndSlippage)
  }
}

export const useGetTradeQuotes = () => {
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const isFoxDiscountsEnabled = useFeatureFlag('FoxDiscounts')
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const [hasFocus, setHasFocus] = useState(document.hasFocus())
  const debouncedTradeQuoteInput = useDebounce(tradeQuoteInput, 500)
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
  // User *may* donate if the fox discounts flag is off and they kept the donation checkbox on
  // or if the fox discounts flag is on and they don't hold enough fox to wave fees out fully
  const userMayDonate = useAppSelector(selectWillDonate) || isFoxDiscountsEnabled

  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

  const userSlippageTolerancePercentage = useAppSelector(selectUserSlippagePercentageDecimal)

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

  useEffect(() => {
    if (wallet && sellAccountId && sellAccountMetadata && receiveAddress && !isVotingPowerLoading) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
        const receiveAssetBip44Params = receiveAccountMetadata?.bip44Params
        const receiveAccountNumber = receiveAssetBip44Params?.accountNumber
        const walletIsKeepKey = wallet && isKeepKeyHDWallet(wallet)
        const isFromEvm = isEvmChainId(sellAsset.chainId)
        // disable EVM donations on KeepKey until https://github.com/shapeshift/web/issues/4518 is resolved
        const mayDonate = walletIsKeepKey ? userMayDonate && !isFromEvm : userMayDonate

        const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(sellAmountCryptoPrecision)
        const potentialAffiliateBps = mayDonate ? DEFAULT_SWAPPER_DONATION_BPS : '0'
        const affiliateBps = (() => {
          if (!isFoxDiscountsEnabled) return potentialAffiliateBps

          // free trades if there's an error getting foxHeld
          if (votingPower === undefined) return '0'

          const affiliateBps = mayDonate
            ? calculateFees({ tradeAmountUsd, foxHeld: bnOrZero(votingPower) }).feeBps.toFixed(0)
            : '0'

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
          slippageTolerancePercentage: userSlippageTolerancePercentage,
          pubKey: isLedger(wallet) ? fromAccountId(sellAccountId).account : undefined,
        })

        // if the quote input args changed, reset the selected swapper and update the trade quote args
        if (!isEqual(tradeQuoteInput, updatedTradeQuoteInput ?? skipToken)) {
          updatedTradeQuoteInput && bnOrZero(sellAmountCryptoPrecision).gt(0)
            ? setTradeQuoteInput(updatedTradeQuoteInput)
            : setTradeQuoteInput(skipToken)

          // If only the affiliateBps or the userSlippageTolerancePercentage changed, we've either:
          // - switched swappers where one has a different default slippageTolerancePercentage
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
    userMayDonate,
    receiveAccountMetadata?.bip44Params,
    userSlippageTolerancePercentage,
    isFoxDiscountsEnabled,
    sellAssetUsdRate,
    sellAccountId,
    isVotingPowerLoading,
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setHasFocus(document.hasFocus())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const { data } = useGetTradeQuoteQuery(debouncedTradeQuoteInput, {
    pollingInterval: hasFocus ? 20000 : undefined,
    /*
      If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
      We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
     */
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    if (data && mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(data)
      mixpanel.track(MixPanelEvents.QuotesReceived, quoteData)
    }
  }, [data, mixpanel])
}

import { fromAccountId } from '@shapeshiftoss/caip'
import type { GetTradeRateInput } from '@shapeshiftoss/swapper'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useTradeReceiveAddress } from '../components/TradeInput/hooks/useTradeReceiveAddress'
import type { GetTradeQuoteOrRateInputArgs } from './useGetTradeQuotes/getTradeQuoteOrRateInput'
import { getTradeQuoteOrRateInput } from './useGetTradeQuotes/getTradeQuoteOrRateInput'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectConfirmedQuote,
  selectConfirmedTradeExecutionState,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useGetTradeRateInput = ({
  queryKeys = [],
  shouldClearQuoteSlice = false,
}: { queryKeys?: string[]; shouldClearQuoteSlice?: boolean } = {}) => {
  const {
    state: { wallet },
  } = useWallet()

  const dispatch = useAppDispatch()

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)
  const userSlippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)
  const confirmedQuote = useAppSelector(selectConfirmedQuote)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

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

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const isBuyAssetChainSupported = walletSupportsBuyAssetChain

  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  const sellAccountNumber = sellAccountMetadata?.bip44Params?.accountNumber

  const affiliateBps = DEFAULT_FEE_BPS

  const walletType = useAppSelector(selectWalletType)

  const pubKey = useMemo(() => {
    const shouldSkipDeviceDerivation =
      walletType === KeyManager.Ledger ||
      walletType === KeyManager.Trezor ||
      walletType === KeyManager.GridPlus

    return shouldSkipDeviceDerivation && sellAccountId
      ? fromAccountId(sellAccountId).account
      : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletType, sellAccountId])

  const tradeInputQueryParams: GetTradeQuoteOrRateInputArgs = useMemo(
    () => ({
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
      pubKey,
    }),
    [
      affiliateBps,
      buyAsset,
      pubKey,
      receiveAddress,
      sellAccountMetadata?.accountType,
      sellAccountNumber,
      sellAmountCryptoPrecision,
      sellAsset,
      userSlippageTolerancePercentageDecimal,
      wallet,
    ],
  )

  const tradeInputQueryKey = useMemo(
    () => ({
      buyAsset,
      sellAmountCryptoPrecision,
      sellAsset,
      userSlippageTolerancePercentageDecimal,
      // TODO(gomes): all the below are what's causing trade input to refentially invalidate on wallet connect
      // We will need to find a way to have our cake and eat it, by ensuring we get bip44 and other addy-related data to
      // referentially invalidate, while ensuring the *initial* connection of a wallet when quotes were gotten without one, doesn't invalidate anything
      sellAccountMetadata,
      receiveAccountMetadata,
      sellAccountId,
      isBuyAssetChainSupported,
      receiveAddress,
    }),
    [
      buyAsset,
      isBuyAssetChainSupported,
      receiveAccountMetadata,
      receiveAddress,
      sellAccountId,
      sellAccountMetadata,
      sellAmountCryptoPrecision,
      sellAsset,
      userSlippageTolerancePercentageDecimal,
    ],
  )

  const { data: tradeRateInput } = useQuery({
    // We need a separate quote key here to useGetTradeRates as that query has some side effects
    queryKey: ['getTradeRateInput', ...queryKeys, tradeInputQueryKey],
    queryFn: async () => {
      // Don't clear quote state during active trade execution
      const isTradeExecuting =
        confirmedQuote &&
        (confirmedTradeExecutionState === TradeExecutionState.Previewing ||
          confirmedTradeExecutionState === TradeExecutionState.FirstHop ||
          confirmedTradeExecutionState === TradeExecutionState.SecondHop)

      // Clear the slice before asynchronously generating the input and running the request.
      // This is to ensure the initial state change is done synchronously to prevent race conditions
      // and losing sync on loading state etc.
      if (shouldClearQuoteSlice && !isTradeExecuting) {
        dispatch(tradeQuoteSlice.actions.clear())
      }

      // Early exit on any invalid state
      if (bnOrZero(sellAmountCryptoPrecision).isZero()) {
        if (shouldClearQuoteSlice && !isTradeExecuting) {
          dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
        }
        return null
      }

      const updatedTradeRateInput = (await getTradeQuoteOrRateInput(
        tradeInputQueryParams,
      )) as GetTradeRateInput

      return updatedTradeRateInput
    },
  })

  return tradeRateInput
}

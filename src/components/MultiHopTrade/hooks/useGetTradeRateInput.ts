import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeRateInput } from '@shapeshiftoss/swapper'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useTradeReceiveAddress } from '../components/TradeInput/hooks/useTradeReceiveAddress'
import type { GetTradeQuoteOrRateInputArgs } from './useGetTradeQuotes/getTradeQuoteOrRateInput'
import { getTradeQuoteOrRateInput } from './useGetTradeQuotes/getTradeQuoteOrRateInput'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
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
      pubKey:
        wallet && isLedger(wallet) && sellAccountId
          ? fromAccountId(sellAccountId).account
          : undefined,
    }),
    [
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAccountId,
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
      // Clear the slice before asynchronously generating the input and running the request.
      // This is to ensure the initial state change is done synchronously to prevent race conditions
      // and losing sync on loading state etc.
      if (shouldClearQuoteSlice) dispatch(tradeQuoteSlice.actions.clear())

      // Early exit on any invalid state
      if (bnOrZero(sellAmountCryptoPrecision).isZero()) {
        if (shouldClearQuoteSlice) {
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

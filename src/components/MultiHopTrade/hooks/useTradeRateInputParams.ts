import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useMemo } from 'react'

import { useTradeReceiveAddress } from '../components/TradeInput/hooks/useTradeReceiveAddress'
import type { GetTradeQuoteOrRateInputArgs } from './useGetTradeQuotes/getTradeQuoteOrRateInput'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import {
  selectPortfolioAccountMetadataByAccountId,
  selectUsdRateByAssetId,
} from '@/state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectLastHopBuyAccountId,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import { useAppSelector } from '@/state/store'

export const useTradeRateInputParams = () => {
  const {
    state: { wallet },
  } = useWallet()

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

  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))

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
      sellAssetUsdRate,
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
      sellAssetUsdRate,
      userSlippageTolerancePercentageDecimal,
    ],
  )
  return { tradeInputQueryKey, tradeInputQueryParams }
}

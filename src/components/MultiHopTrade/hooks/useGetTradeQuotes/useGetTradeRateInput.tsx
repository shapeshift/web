import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { GetTradeRateInput } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useTradeReceiveAddress } from '@/components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { getTradeQuoteOrRateInput } from '@/components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteOrRateInput'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import { selectUsdRateByAssetId } from '@/state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
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

type UseGetTradeRateInputProps = {
  shouldClearSlice?: boolean
}

export const useGetTradeRateInput = ({
  shouldClearSlice = false,
}: UseGetTradeRateInputProps = {}) => {
  const dispatch = useAppDispatch()
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

  return useQuery({
    queryKey: [
      'getTradeRateInput',
      {
        buyAsset,
        sellAmountCryptoPrecision,
        sellAsset,
        userSlippageTolerancePercentageDecimal,
        sellAssetUsdRate,
        sellAccountMetadata,
        receiveAccountMetadata,
        sellAccountId,
        isBuyAssetChainSupported,
        receiveAddress,
      },
    ],
    queryFn: async (): Promise<GetTradeRateInput | null> => {
      // Clear the slice before asynchronously generating the input and running the request.
      // This is to ensure the initial state change is done synchronously to prevent race conditions
      // and losing sync on loading state etc.
      if (shouldClearSlice) {
        dispatch(tradeQuoteSlice.actions.clear())
      }

      // Early exit on any invalid state
      if (bnOrZero(sellAmountCryptoPrecision).isZero()) {
        if (shouldClearSlice) {
          dispatch(tradeQuoteSlice.actions.setIsTradeQuoteRequestAborted(true))
        }
        return null
      }
      const sellAccountNumber = sellAccountMetadata?.bip44Params?.accountNumber

      const affiliateBps = DEFAULT_FEE_BPS

      const updatedTradeRateInput = (await getTradeQuoteOrRateInput({
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
        slippageTolerancePercentageDecimal: userSlippageTolerancePercentageDecimal,
        pubKey:
          wallet && isLedger(wallet) && sellAccountId
            ? fromAccountId(sellAccountId).account
            : undefined,
      })) as GetTradeRateInput

      return updatedTradeRateInput
    },
  })
}


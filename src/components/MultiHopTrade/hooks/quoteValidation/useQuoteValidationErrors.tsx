import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useMemo } from 'react'
import { useInsufficientBalanceProtocolFeeMeta } from 'components/MultiHopTrade/hooks/quoteValidation/useInsufficientBalanceProtocolFeeMeta'
import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { useIsTradingActive } from 'components/MultiHopTrade/hooks/useIsTradingActive'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { ActiveQuoteStatus } from 'components/MultiHopTrade/types'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isTruthy } from 'lib/utils'
import { selectSwappersApiTradeQuotes } from 'state/apis/swappers/selectors'
import { selectManualReceiveAddress } from 'state/slices/swappersSlice/selectors'
import {
  selectBuyAmountBeforeFeesCryptoBaseUnit,
  selectFirstHopBuyAsset,
  selectFirstHopNetworkFeeCryptoPrecision,
  selectFirstHopSellAsset,
  selectFirstHopTradeDeductionCryptoPrecision,
  selectIsActiveQuoteMultiHop,
  selectIsUnsafeActiveQuote,
  selectLastHopBuyAsset,
  selectSecondHopNetworkFeeCryptoPrecision,
  selectSellAmountCryptoBaseUnit,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useQuoteValidationErrors = (): ActiveQuoteStatus[] => {
  const {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    secondHopFeeAssetBalancePrecision,
  } = useHopHelper()
  const wallet = useWallet().state.wallet
  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = useIsTradingActive()
  const insufficientBalanceProtocolFeeMeta = useInsufficientBalanceProtocolFeeMeta()

  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const sellAmountCryptoBaseUnit = useAppSelector(selectSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountBeforeFeesCryptoBaseUnit)
  const firstHopNetworkFeeCryptoPrecision = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const secondHopNetworkFeeCryptoPrecision = useAppSelector(
    selectSecondHopNetworkFeeCryptoPrecision,
  )
  const firstHopTradeDeductionCryptoPrecision = useAppSelector(
    selectFirstHopTradeDeductionCryptoPrecision,
  )
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const intermediaryAsset = useAppSelector(selectFirstHopBuyAsset)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )
  const receiveAddress = useReceiveAddress(useReceiveAddressArgs)
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)
  const quotes = useAppSelector(selectSwappersApiTradeQuotes)

  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)

  const isSnapInstalled = useIsSnapInstalled()

  const walletSupportsSellAssetChain =
    firstHopSellAsset &&
    walletSupportsChain({
      chainId: firstHopSellAsset.chainId,
      wallet,
      isSnapInstalled,
    })
  // multi-hop trades require the wallet supports the intermediary buy asset
  // this will be the same as walletSupportsBuyAssetChain for single hop trades
  const walletSupportsIntermediaryAssetChain =
    intermediaryAsset &&
    walletSupportsChain({
      chainId: intermediaryAsset.chainId,
      wallet,
      isSnapInstalled,
    })
  const walletSupportsBuyAssetChain =
    lastHopBuyAsset &&
    walletSupportsChain({
      chainId: lastHopBuyAsset.chainId,
      wallet,
      isSnapInstalled,
    })

  const hasSufficientSellAssetBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    bnOrZero(sellAmountCryptoBaseUnit),
  )
  const firstHopHasSufficientBalanceForGas = bnOrZero(firstHopFeeAssetBalancePrecision)
    .minus(firstHopNetworkFeeCryptoPrecision ?? 0)
    .minus(firstHopTradeDeductionCryptoPrecision ?? 0)
    .gte(0)

  const secondHopHasSufficientBalanceForGas = bnOrZero(secondHopFeeAssetBalancePrecision)
    .minus(secondHopNetworkFeeCryptoPrecision ?? 0)
    .gte(0)

  const feesExceedsSellAmount =
    bnOrZero(sellAmountCryptoBaseUnit).isGreaterThan(0) &&
    bnOrZero(buyAmountCryptoBaseUnit).isLessThanOrEqualTo(0)

  const quoteStatuses: ActiveQuoteStatus[] = useMemo(
    () =>
      [
        !wallet && ActiveQuoteStatus.NoConnectedWallet,
        !walletSupportsSellAssetChain && ActiveQuoteStatus.SellAssetNotNotSupportedByWallet,
        !walletSupportsIntermediaryAssetChain &&
          isMultiHopTrade &&
          ActiveQuoteStatus.IntermediaryAssetNotNotSupportedByWallet,
        !walletSupportsBuyAssetChain &&
          !manualReceiveAddress &&
          ActiveQuoteStatus.BuyAssetNotNotSupportedByWallet,
        !hasSufficientSellAssetBalance && ActiveQuoteStatus.InsufficientSellAssetBalance,
        !firstHopHasSufficientBalanceForGas &&
          ActiveQuoteStatus.InsufficientFirstHopFeeAssetBalance,
        !secondHopHasSufficientBalanceForGas &&
          ActiveQuoteStatus.InsufficientSecondHopFeeAssetBalance,
        !receiveAddress && ActiveQuoteStatus.NoReceiveAddress,
        !isTradingActiveOnSellPool && ActiveQuoteStatus.TradingInactiveOnSellChain,
        !isTradingActiveOnBuyPool && ActiveQuoteStatus.TradingInactiveOnBuyChain,
        feesExceedsSellAmount && ActiveQuoteStatus.SellAmountBelowTradeFee,
        insufficientBalanceProtocolFeeMeta && ActiveQuoteStatus.InsufficientFundsForProtocolFee,
        isUnsafeQuote && ActiveQuoteStatus.UnsafeQuote,
        quotes.length === 0 &&
          bnOrZero(sellAmountCryptoBaseUnit).gt(0) &&
          ActiveQuoteStatus.NoQuotesAvailable,
      ].filter(isTruthy),
    [
      wallet,
      walletSupportsSellAssetChain,
      walletSupportsIntermediaryAssetChain,
      isMultiHopTrade,
      walletSupportsBuyAssetChain,
      manualReceiveAddress,
      hasSufficientSellAssetBalance,
      firstHopHasSufficientBalanceForGas,
      secondHopHasSufficientBalanceForGas,
      receiveAddress,
      isTradingActiveOnSellPool,
      isTradingActiveOnBuyPool,
      feesExceedsSellAmount,
      insufficientBalanceProtocolFeeMeta,
      isUnsafeQuote,
      quotes.length,
      sellAmountCryptoBaseUnit,
    ],
  )

  return quoteStatuses
}

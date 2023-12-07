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
  selectFirstHopNetworkFeeCryptoPrecision,
  selectFirstHopSellAsset,
  selectFirstHopTradeDeductionCryptoPrecision,
  selectIsUnsafeActiveQuote,
  selectLastHopBuyAsset,
  selectLastHopNetworkFeeCryptoPrecision,
  selectSellAmountCryptoBaseUnit,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useQuoteValidationErrors = (): ActiveQuoteStatus[] => {
  const {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    lastHopFeeAssetBalancePrecision,
  } = useHopHelper()
  const wallet = useWallet().state.wallet
  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = useIsTradingActive()
  const insufficientBalanceProtocolFeeMeta = useInsufficientBalanceProtocolFeeMeta()

  const sellAmountCryptoBaseUnit = useAppSelector(selectSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountBeforeFeesCryptoBaseUnit)
  const firstHopNetworkFeeCryptoPrecision = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const lastHopNetworkFeeCryptoPrecision = useAppSelector(selectLastHopNetworkFeeCryptoPrecision)
  const firstHopTradeDeductionCryptoPrecision = useAppSelector(
    selectFirstHopTradeDeductionCryptoPrecision,
  )
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
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

  const lastHopHasSufficientBalanceForGas = bnOrZero(lastHopFeeAssetBalancePrecision)
    .minus(lastHopNetworkFeeCryptoPrecision)
    .gte(0)

  const feesExceedsSellAmount =
    bnOrZero(sellAmountCryptoBaseUnit).isGreaterThan(0) &&
    bnOrZero(buyAmountCryptoBaseUnit).isLessThanOrEqualTo(0)

  const quoteStatuses: ActiveQuoteStatus[] = useMemo(
    () =>
      [
        !wallet && ActiveQuoteStatus.NoConnectedWallet,
        !walletSupportsSellAssetChain && ActiveQuoteStatus.SellAssetNotNotSupportedByWallet,
        !walletSupportsBuyAssetChain &&
          !manualReceiveAddress &&
          ActiveQuoteStatus.BuyAssetNotNotSupportedByWallet,
        !hasSufficientSellAssetBalance && ActiveQuoteStatus.InsufficientSellAssetBalance,
        !firstHopHasSufficientBalanceForGas &&
          ActiveQuoteStatus.InsufficientFirstHopFeeAssetBalance,
        !lastHopHasSufficientBalanceForGas && ActiveQuoteStatus.InsufficientLastHopFeeAssetBalance,
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
      feesExceedsSellAmount,
      firstHopHasSufficientBalanceForGas,
      hasSufficientSellAssetBalance,
      insufficientBalanceProtocolFeeMeta,
      isTradingActiveOnBuyPool,
      isTradingActiveOnSellPool,
      isUnsafeQuote,
      lastHopHasSufficientBalanceForGas,
      manualReceiveAddress,
      quotes.length,
      receiveAddress,
      sellAmountCryptoBaseUnit,
      wallet,
      walletSupportsBuyAssetChain,
      walletSupportsSellAssetChain,
    ],
  )

  return quoteStatuses
}

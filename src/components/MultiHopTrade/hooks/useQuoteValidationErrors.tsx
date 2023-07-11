import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { useIsTradingActive } from 'components/MultiHopTrade/hooks/useIsTradingActive'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { ActiveQuoteStatus } from 'components/MultiHopTrade/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isTruthy } from 'lib/utils'
import { selectManualReceiveAddress } from 'state/slices/swappersSlice/selectors'
import {
  selectFirstHopNetworkFeeCryptoPrecision,
  selectFirstHopSellAsset,
  selectFirstHopTradeDeductionCryptoPrecision,
  selectLastHopBuyAsset,
  selectLastHopNetworkFeeCryptoPrecision,
  selectMinimumSellAmountCryptoBaseUnit,
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

  const sellAmountCryptoBaseUnit = useAppSelector(selectSellAmountCryptoBaseUnit)
  const firstHopNetworkFeeCryptoPrecision = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const lastHopNetworkFeeCryptoPrecision = useAppSelector(selectLastHopNetworkFeeCryptoPrecision)
  const firstHopTradeDeductionCryptoPrecision = useAppSelector(
    selectFirstHopTradeDeductionCryptoPrecision,
  )
  const minimumSellAmountBaseUnit = useAppSelector(selectMinimumSellAmountCryptoBaseUnit)
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const receiveAddress = useReceiveAddress()
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const walletSupportsSellAssetChain =
    firstHopSellAsset &&
    walletSupportsChain({
      chainId: firstHopSellAsset.chainId,
      wallet,
    })
  const walletSupportsBuyAssetChain =
    lastHopBuyAsset &&
    walletSupportsChain({
      chainId: lastHopBuyAsset.chainId,
      wallet,
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

  const isBelowMinimumSellAmount = bnOrZero(sellAmountCryptoBaseUnit).lt(
    minimumSellAmountBaseUnit ?? 0,
  )

  return [
    !hasSufficientSellAssetBalance && ActiveQuoteStatus.InsufficientSellAssetBalance,
    !firstHopHasSufficientBalanceForGas && ActiveQuoteStatus.InsufficientFirstHopFeeAssetBalance,
    !lastHopHasSufficientBalanceForGas && ActiveQuoteStatus.InsufficientLastHopFeeAssetBalance,
    isBelowMinimumSellAmount && ActiveQuoteStatus.SellAmountBelowMinimum,
    !walletSupportsSellAssetChain && ActiveQuoteStatus.SellAssetNotNotSupportedByWallet,
    !walletSupportsBuyAssetChain &&
      !manualReceiveAddress &&
      ActiveQuoteStatus.BuyAssetNotNotSupportedByWallet,
    !receiveAddress && ActiveQuoteStatus.NoReceiveAddress,
    !isTradingActiveOnSellPool && ActiveQuoteStatus.TradingInactiveOnSellChain,
    !isTradingActiveOnBuyPool && ActiveQuoteStatus.TradingInactiveOnBuyChain,
  ].filter(isTruthy)
}

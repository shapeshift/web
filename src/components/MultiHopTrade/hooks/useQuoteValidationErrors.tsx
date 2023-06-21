import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { SelectedQuoteStatus } from 'components/MultiHopTrade/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isTruthy } from 'lib/utils'
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

type QuoteValidationErrors = SelectedQuoteStatus[]

export const useQuoteValidationErrors = (): QuoteValidationErrors => {
  const {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    lastHopFeeAssetBalancePrecision,
  } = useHopHelper()
  const wallet = useWallet().state.wallet

  const sellAmountCryptoBaseUnit = useAppSelector(selectSellAmountCryptoBaseUnit)
  const firstHopNetworkFeeCryptoPrecision = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const lastHopNetworkFeeCryptoPrecision = useAppSelector(selectLastHopNetworkFeeCryptoPrecision)
  const firstHopTradeDeductionCryptoPrecision = useAppSelector(
    selectFirstHopTradeDeductionCryptoPrecision,
  )
  const minimumSellAmountBaseUnit = useAppSelector(selectMinimumSellAmountCryptoBaseUnit)
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)

  const walletSupportsSellAssetChain = walletSupportsChain({
    chainId: firstHopSellAsset?.chainId ?? '',
    wallet,
  })
  const walletSupportsBuyAssetChain = walletSupportsChain({
    chainId: lastHopBuyAsset?.chainId ?? '',
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
    hasSufficientSellAssetBalance && SelectedQuoteStatus.InsufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas && SelectedQuoteStatus.InsufficientFirstHopFeeAssetBalance,
    lastHopHasSufficientBalanceForGas && SelectedQuoteStatus.InsufficientLastHopFeeAssetBalance,
    isBelowMinimumSellAmount && SelectedQuoteStatus.SellAmountBelowMinimum,
    walletSupportsSellAssetChain && SelectedQuoteStatus.SellAssetNotNotSupportedByWallet,
    walletSupportsBuyAssetChain && SelectedQuoteStatus.BuyAssetNotNotSupportedByWallet,
  ].filter(isTruthy)
}

import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { bnOrZero } from 'lib/bignumber/bignumber'

type QuoteValidationPredicateObject = Record<string, boolean>

export const useQuoteValidationPredicateObject = (): QuoteValidationPredicateObject => {
  const {
    sellAssetBalanceCryptoBaseUnit,
    sellAmountCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    firstHopNetworkFeeCryptoPrecision,
    firstHopTradeDeductionCryptoPrecision,
    lastHopFeeAssetBalancePrecision,
    lastHopNetworkFeeCryptoPrecision,
  } = useHopHelper()

  const hasSufficientSellAssetBalance = bnOrZero(sellAssetBalanceCryptoBaseUnit).gte(
    bnOrZero(sellAmountCryptoBaseUnit),
  )
  const firstHopHasSufficientBalanceForGas = bnOrZero(firstHopFeeAssetBalancePrecision)
    .minus(firstHopNetworkFeeCryptoPrecision)
    .minus(firstHopTradeDeductionCryptoPrecision)
    .gte(0)

  const lastHopHasSufficientBalanceForGas = bnOrZero(lastHopFeeAssetBalancePrecision)
    .minus(lastHopNetworkFeeCryptoPrecision)
    .gte(0)

  return {
    hasSufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas,
    lastHopHasSufficientBalanceForGas,
  }
}

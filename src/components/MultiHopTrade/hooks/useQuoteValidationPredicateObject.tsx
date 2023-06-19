import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectSellAmountCryptoBaseUnit } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

type QuoteValidationPredicateObject = Record<string, boolean>

export const useQuoteValidationPredicateObject = (): QuoteValidationPredicateObject => {
  const {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    firstHopNetworkFeeCryptoPrecision,
    firstHopTradeDeductionCryptoPrecision,
    lastHopFeeAssetBalancePrecision,
    lastHopNetworkFeeCryptoPrecision,
  } = useHopHelper()

  const sellAmountCryptoBaseUnit = useAppSelector(selectSellAmountCryptoBaseUnit)

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

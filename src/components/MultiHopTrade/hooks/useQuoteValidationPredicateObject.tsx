import { useHopHelper } from 'components/MultiHopTrade/hooks/useHopHelper'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectFirstHopNetworkFeeCryptoPrecision,
  selectFirstHopTradeDeductionCryptoPrecision,
  selectLastHopNetworkFeeCryptoPrecision,
  selectMinimumSellAmountCryptoBaseUnit,
  selectSellAmountCryptoBaseUnit,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

type QuoteValidationPredicateObject = Record<string, boolean>

export const useQuoteValidationPredicateObject = (): QuoteValidationPredicateObject => {
  const {
    sellAssetBalanceCryptoBaseUnit,
    firstHopFeeAssetBalancePrecision,
    lastHopFeeAssetBalancePrecision,
  } = useHopHelper()

  const sellAmountCryptoBaseUnit = useAppSelector(selectSellAmountCryptoBaseUnit)
  const firstHopNetworkFeeCryptoPrecision = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const lastHopNetworkFeeCryptoPrecision = useAppSelector(selectLastHopNetworkFeeCryptoPrecision)
  const firstHopTradeDeductionCryptoPrecision = useAppSelector(
    selectFirstHopTradeDeductionCryptoPrecision,
  )
  const minimumSellAmountBaseUnit = useAppSelector(selectMinimumSellAmountCryptoBaseUnit)

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

  return {
    hasSufficientSellAssetBalance,
    firstHopHasSufficientBalanceForGas,
    lastHopHasSufficientBalanceForGas,
    isBelowMinimumSellAmount, // todo: consume
  }
}

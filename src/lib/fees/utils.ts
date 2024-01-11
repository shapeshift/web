import type { SwapperName, TradeQuote } from '@shapeshiftoss/swapper'
import { bnOrZero } from 'lib/bignumber/bignumber'

type CalculateShapeShiftFeeArgs = {
  amountBeforeDiscountUserCurrency: string | undefined
  amountAfterDiscountUserCurrency: string | undefined
  affiliateBps: string | undefined
  potentialAffiliateBps: string | undefined
}

type CalculateShapeShiftAndAffiliateFeeArgs = {
  quote: TradeQuote | undefined
  potentialAffiliateFeeAmountUserCurrency: string | undefined
  affiliateFeeAmountUserCurrency: string
  affiliateBps: string | undefined
  potentialAffiliateBps: string | undefined
  swapperName: SwapperName | undefined
}

export type ShapeShiftFee = {
  amountAfterDiscountUserCurrency: string
  amountBeforeDiscountUserCurrency: string
  feeDiscountUserCurrency: string
  affiliateBps: string
  potentialAffiliateBps: string
  foxDiscountPercent: string
}

export const calculateShapeShiftFee = ({
  amountBeforeDiscountUserCurrency: _amountBeforeDiscountUserCurrency,
  amountAfterDiscountUserCurrency: _amountAfterDiscountUserCurrency,
  affiliateBps,
  potentialAffiliateBps,
}: CalculateShapeShiftFeeArgs): ShapeShiftFee => {
  const amountBeforeDiscountUserCurrency = _amountBeforeDiscountUserCurrency ?? '0'
  const amountAfterDiscountUserCurrency = _amountAfterDiscountUserCurrency ?? '0'

  const feeDiscountUserCurrency = bnOrZero(_amountBeforeDiscountUserCurrency)
    .minus(amountAfterDiscountUserCurrency)
    .toString()

  return {
    amountAfterDiscountUserCurrency,
    amountBeforeDiscountUserCurrency,
    feeDiscountUserCurrency,
    affiliateBps: affiliateBps ?? '0',
    potentialAffiliateBps: potentialAffiliateBps ?? '0',
    foxDiscountPercent:
      // zero denominator will evaluate to 100% discount
      amountBeforeDiscountUserCurrency !== '0'
        ? bnOrZero(feeDiscountUserCurrency)
            .div(amountBeforeDiscountUserCurrency ?? 0)
            .toString()
        : '1',
  }
}

export const calculateShapeShiftAndAffiliateFee = ({
  quote,
  potentialAffiliateFeeAmountUserCurrency,
  affiliateFeeAmountUserCurrency,
  affiliateBps,
  potentialAffiliateBps,
}: CalculateShapeShiftAndAffiliateFeeArgs): {
  shapeShiftFee: ShapeShiftFee | undefined
} => {
  if (quote) {
    return {
      shapeShiftFee: calculateShapeShiftFee({
        amountBeforeDiscountUserCurrency: potentialAffiliateFeeAmountUserCurrency,
        amountAfterDiscountUserCurrency: affiliateFeeAmountUserCurrency,
        affiliateBps,
        potentialAffiliateBps,
      }),
    }
  }

  return {
    shapeShiftFee: undefined,
  }
}

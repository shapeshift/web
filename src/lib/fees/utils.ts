import { bnOrZero } from 'lib/bignumber/bignumber'
import type { TradeQuote } from 'lib/swapper/types'
import { SwapperName } from 'lib/swapper/types'

type CalculateShapeShiftFeeArgs = {
  amountBeforeDiscountUserCurrency: string | undefined
  amountAfterDiscountUserCurrency: string | undefined
  affiliateBps: string | undefined
  potentialAffiliateBps: string | undefined
}

type CalculateShapeShiftAndAffiliateFeeArgs = {
  quote: TradeQuote | undefined
  isFoxDiscountsEnabled: boolean
  potentialDonationAmountUserCurrency: string | undefined
  donationAmountUserCurrency: string
  affiliateBps: string | undefined
  potentialAffiliateBps: string | undefined
  applyThorSwapAffiliateFees: boolean
  swapperName: SwapperName | undefined
}

type ShapeShiftFee = {
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
  isFoxDiscountsEnabled,
  potentialDonationAmountUserCurrency,
  donationAmountUserCurrency,
  affiliateBps,
  potentialAffiliateBps,
  applyThorSwapAffiliateFees,
  swapperName,
}: CalculateShapeShiftAndAffiliateFeeArgs): {
  shapeShiftFee: ShapeShiftFee | undefined
  donationAmountUserCurrency: string | undefined
} => {
  if (quote) {
    if (isFoxDiscountsEnabled) {
      return {
        shapeShiftFee: calculateShapeShiftFee({
          amountBeforeDiscountUserCurrency: potentialDonationAmountUserCurrency,
          amountAfterDiscountUserCurrency: donationAmountUserCurrency,
          affiliateBps,
          potentialAffiliateBps,
        }),
        donationAmountUserCurrency: undefined,
      }
    } else {
      // The donation/shapeshiftFee vernacular is weird but expected for THOR,
      // see https://github.com/shapeshift/web/pull/5230
      if (applyThorSwapAffiliateFees && swapperName === SwapperName.Thorchain && quote) {
        return {
          shapeShiftFee: {
            amountAfterDiscountUserCurrency: potentialDonationAmountUserCurrency ?? '0',
            amountBeforeDiscountUserCurrency: potentialDonationAmountUserCurrency ?? '0',
            affiliateBps: quote.potentialAffiliateBps ?? '0',
            foxDiscountPercent: '0',
            potentialAffiliateBps: potentialAffiliateBps ?? '0',
            feeDiscountUserCurrency: '0',
          },
          donationAmountUserCurrency: undefined,
        }
      }

      return { shapeShiftFee: undefined, donationAmountUserCurrency }
    }
  }

  return {
    shapeShiftFee: undefined,
    donationAmountUserCurrency: undefined,
  }
}

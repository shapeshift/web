import { BigAmount, bn } from '@shapeshiftoss/utils'

import type { SwapMachineEvent } from '../machines/types'
import { parseAmount } from '../types'

export const fiatToCrypto = (
  fiat: string,
  price: string,
  precision: number,
): { amount: string; amountBaseUnit: string | undefined } => {
  const fiatBn = bn(fiat)
  const priceBn = bn(price)

  if (!fiatBn.isFinite() || fiatBn.lte(0) || !priceBn.isFinite() || priceBn.lte(0)) {
    return { amount: '', amountBaseUnit: undefined }
  }

  const amount = fiatBn.div(priceBn).toFixed(precision)

  return { amount, amountBaseUnit: parseAmount(amount, precision) }
}

export const cryptoToFiat = (
  amountBaseUnit: string | undefined,
  price: string,
  precision: number,
): string => {
  const priceBn = bn(price)

  if (!amountBaseUnit || amountBaseUnit === '0' || !priceBn.isFinite() || priceBn.lte(0)) {
    return ''
  }

  const cryptoAmount = BigAmount.fromBaseUnit({ value: amountBaseUnit, precision }).toPrecision()

  return bn(cryptoAmount).times(priceBn).toFixed(2)
}

export const computeSellFiatSyncAction = (params: {
  isSellAmountFiat: boolean
  sellAmountFiat: string
  sellAmountBaseUnit: string | undefined
  sellAssetUsdPrice: string | undefined
  sellPrecision: number
}): SwapMachineEvent | null => {
  const { isSellAmountFiat, sellAmountFiat, sellAmountBaseUnit, sellAssetUsdPrice, sellPrecision } =
    params

  if (!isSellAmountFiat) return null
  // Asset has no price: can't stay in fiat mode (no conversion, and the toggle is hidden),
  // so revert to crypto entry regardless of whether an amount was entered.
  if (!sellAssetUsdPrice) return { type: 'SET_SELL_FIAT_MODE', isFiat: false }
  if (!sellAmountFiat) return null
  // Only fill crypto when it's missing (e.g. cleared by a sell-asset change). Never overwrite an
  // existing amount — that would snap an exact crypto value to its 2-decimal fiat round-trip.
  if (sellAmountBaseUnit) return null

  const { amount, amountBaseUnit } = fiatToCrypto(sellAmountFiat, sellAssetUsdPrice, sellPrecision)

  return { type: 'SET_SELL_AMOUNT', amount, amountBaseUnit, fiatValue: sellAmountFiat }
}

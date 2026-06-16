import { BigAmount, bn } from '@shapeshiftoss/utils'

import { parseAmount } from '../types'

// Convert a human-readable fiat (USD) amount into the equivalent crypto amount,
// returning both the human crypto string and the base-unit string used for quoting.
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

// Convert a crypto base-unit amount into a raw, editable fiat input string
// (no $/K/M formatting — distinct from the display-only formatUsdValue).
export const cryptoToFiatInput = (
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

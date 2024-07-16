import type { LpConfirmedDepositQuote, LpConfirmedWithdrawalQuote } from './types'

export function isLpConfirmedDepositQuote(
  quote: Record<string, unknown> | null,
): quote is LpConfirmedDepositQuote {
  return (
    quote !== null &&
    quote.assetDepositAmountCryptoPrecision !== undefined &&
    quote.assetDepositAmountFiatUserCurrency !== undefined &&
    quote.runeDepositAmountCryptoPrecision !== undefined &&
    quote.runeDepositAmountFiatUserCurrency !== undefined
  )
}

export function isLpConfirmedWithdrawalQuote(
  quote?: Record<string, unknown>,
): quote is LpConfirmedWithdrawalQuote {
  return Boolean(
    quote &&
      quote.assetWithdrawAmountCryptoPrecision !== undefined &&
      quote.assetWithdrawAmountFiatUserCurrency !== undefined &&
      quote.runeWithdrawAmountCryptoPrecision !== undefined &&
      quote.runeWithdrawAmountFiatUserCurrency !== undefined,
  )
}

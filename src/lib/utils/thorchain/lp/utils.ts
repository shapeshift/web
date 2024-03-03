import type { LpConfirmedDepositQuote, LpConfirmedWithdrawalQuote } from './types'

export function isLpConfirmedDepositQuote(
  quote: Record<string, unknown> | null,
): quote is LpConfirmedDepositQuote {
  return (
    quote !== null &&
    quote.assetCryptoDepositAmount !== undefined &&
    quote.assetFiatDepositAmount !== undefined &&
    quote.runeCryptoDepositAmount !== undefined &&
    quote.runeFiatDepositAmount !== undefined
  )
}

export function isLpConfirmedWithdrawalQuote(
  quote: Record<string, unknown>,
): quote is LpConfirmedWithdrawalQuote {
  return (
    quote &&
    quote.assetCryptoWithdrawAmount !== undefined &&
    quote.assetFiatWithdrawAmount !== undefined &&
    quote.runeCryptoWithdrawAmount !== undefined &&
    quote.runeFiatWithdrawAmount !== undefined
  )
}

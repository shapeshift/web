// TODO(gomes): this isn't lending specific and we should consolidate these across THOR domains
export type QuoteFees = {
  asset: string
  affiliate?: string
  outbound?: string
  liquidity: string
  total: string
  slippage_bps: number
  total_bps: number
}

type BaseQuoteResponse = {
  dust_threshold: string
  expected_amount_out: string
  expiry: number
  fees: QuoteFees
  inbound_address: string
  inbound_confirmation_blocks: number
  inbound_confirmation_seconds: number
  memo: string
  notes: string
  outbound_delay_blocks: number
  outbound_delay_seconds: number
  recommended_min_amount_in: string
  router: string
  /** @deprecated use fees.slippage_bps instead */
  slippage_bps: number
  /** @deprecated
   * use fees.slippage_bps instead
   * note: there is no explicit fees.streaming_slippage_bps and streaming / regular bps is automagical for the time being.
   */
  streaming_slippage_bps: number
  warning: string
}

export type LendingDepositQuoteResponseSuccess = BaseQuoteResponse & {
  expected_debt_issued: string
  expected_collateral_deposited: string
  expected_collateralization_ratio: string
}

export type LendingDepositQuoteResponseError = {
  error: string
}

export type LendingDepositQuoteResponse =
  | LendingDepositQuoteResponseSuccess
  | LendingDepositQuoteResponseError

export type LendingWithdrawQuoteResponseSuccess = BaseQuoteResponse & {
  expected_collateral_withdrawn: string
  expected_debt_repaid: string
}

export type LendingWithdrawQuoteResponseError = {
  error: string
}

export type LendingWithdrawQuoteResponse =
  | LendingWithdrawQuoteResponseSuccess
  | LendingWithdrawQuoteResponseError

export type Borrower = {
  owner: string
  asset: string
  debt_issued: string
  debt_repaid: string
  debt_current: string
  collateral_deposited: string
  collateral_withdrawn: string
  collateral_current: string
  last_open_height: number
  last_repay_height: number
}

export type BorrowersResponseSuccess = Borrower[]

export type BorrowersResponseError = {
  error: string
}

export type BorrowersResponse = BorrowersResponseSuccess | BorrowersResponseError

export type LendingQuoteOpen = {
  quoteCollateralAmountCryptoPrecision: string
  quoteCollateralAmountFiatUserCurrency: string
  quoteDebtAmountUserCurrency: string
  quoteBorrowedAmountCryptoPrecision: string
  quoteBorrowedAmountUserCurrency: string
  quoteCollateralizationRatioPercentDecimal: string
  quoteSlippageBorrowedAssetCryptoPrecision: string
  quoteTotalFeesFiatUserCurrency: string
  quoteInboundAddress: string
  quoteMemo: string
  quoteExpiry: number
}

export type LendingQuoteClose = {
  quoteLoanCollateralDecreaseCryptoPrecision: string
  quoteLoanCollateralDecreaseFiatUserCurrency: string
  quoteDebtRepaidAmountUserCurrency: string
  quoteWithdrawnAmountAfterFeesCryptoPrecision: string
  quoteWithdrawnAmountAfterFeesUserCurrency: string
  quoteSlippageWithdrawndAssetCryptoPrecision: string
  quoteTotalFeesFiatUserCurrency: string
  quoteInboundAddress: string
  quoteMemo: string
  repaymentAmountCryptoPrecision: string | null
  quoteExpiry: number
}

export const isLendingQuoteOpen = (
  quote: LendingQuoteOpen | LendingQuoteClose | null,
): quote is LendingQuoteOpen => Boolean(quote && 'quoteBorrowedAmountCryptoPrecision' in quote)

export const isLendingQuoteClose = (
  quote: LendingQuoteOpen | LendingQuoteClose | null,
): quote is LendingQuoteClose => Boolean(quote && 'quoteDebtRepaidAmountUserCurrency' in quote)

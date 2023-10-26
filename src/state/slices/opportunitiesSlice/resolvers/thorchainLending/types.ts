type QuoteFees = {
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
  slippage_bps: number
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

export type LendingDepositQuoteResponseSuccess = {
  inbound_address: string
  inbound_confirmation_blocks: number
  inbound_confirmation_seconds: number
  outbound_delay_blocks: number
  outbound_delay_seconds: number
  fees: {
    asset: string
    affiliate: string
    outbound: string
    liquidity: string
    total: string
    slippage_bps: number
    total_bps: number
  }
  slippage_bps: number
  streaming_slippage_bps: number
  router: string
  expiry: number
  warning: string
  notes: string
  dust_threshold: string
  recommended_min_amount_in: string
  memo: string
  expected_amount_out: string
  expected_collateralization_ratio: string
  expected_collateral_deposited: string
  expected_debt_issued: string
}

export type LendingDepositQuoteResponseError = {
  error: string
}

export type LendingDepositQuoteResponse =
  | LendingDepositQuoteResponseSuccess
  | LendingDepositQuoteResponseError

export type LendingWithdrawQuoteResponseSuccess = {
  inbound_address: string
  inbound_confirmation_blocks: number
  inbound_confirmation_seconds: number
  outbound_delay_blocks: number
  outbound_delay_seconds: number
  fees: {
    asset: string
    affiliate: string
    outbound: string
    liquidity: string
    total: string
    slippage_bps: number
    total_bps: number
  }
  slippage_bps: number
  streaming_slippage_bps: number
  router: string
  expiry: number
  warning: string
  notes: string
  dust_threshold: string
  recommended_min_amount_in: string
  memo: string
  expected_amount_out: string
  expected_collateral_withdrawn: string
  expected_debt_repaid: string
}

export type LendingWithdrawQuoteResponseError = {
  error: string
}

export type LendingWithdrawQuoteResponse =
  | LendingWithdrawQuoteResponseSuccess
  | LendingWithdrawQuoteResponseError

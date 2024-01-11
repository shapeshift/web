export type ThorNodeLiquidityProvider = {
  asset: string
  asset_address?: string
  rune_address?: string
  last_add_height?: number
  last_withdraw_height?: number
  pending_rune: string
  pending_asset: string
  pending_tx_id?: string
  units: string
  rune_deposit_value: string
  asset_deposit_value: string
}

export type MidgardPool = {
  assetAdded: string
  assetAddress: string
  assetDeposit: string
  assetPending: string
  assetWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
  liquidityUnits: string
  pool: string
  runeAdded: string
  runeAddress: string
  runeDeposit: string
  runePending: string
  runeWithdrawn: string
}
export type MidgardLiquidityProvider = {
  pools: MidgardPool[]
}

// TODO(gomes): This is the LP provider type from /liquidity_provider/<address>, which contains more data then the one from /liquidity_providers/
// use this instead of the /liquidity_providers/ endpoint when applicable, and perhaps consume those fields if useful?
// We're not using this anywhere just yet, but most likely should.
export type ExtendedThorNodeLiquidityProvider = ThorNodeLiquidityProvider & {
  rune_redeem_value: string
  asset_redeem_value: string
  luvi_deposit_value: string
  luvi_redeem_value: string
  luvi_growth_pct: string
}

export type ThorchainLiquidityProvidersResponseSuccess = ThorNodeLiquidityProvider[]

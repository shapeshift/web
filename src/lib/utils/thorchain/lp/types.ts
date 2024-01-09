export type LiquidityProvider = {
  asset: string
  asset_address: string
  last_add_height: number
  units: string
  pending_rune: string
  pending_asset: string
  rune_deposit_value: string
  asset_deposit_value: string
}

// TODO(gomes): This is the LP provider type from /liquidity_provider/<address>, which contains more data then the one from /liquidity_providers/
// use this instead of the /liquidity_providers/ endpoint when applicable, and perhaps consume those fields if useful?
// We're not using this anywhere just yet, but most likely should.
export type ExtendedLiquidityProvider = LiquidityProvider & {
  rune_redeem_value: string
  asset_redeem_value: string
  luvi_deposit_value: string
  luvi_redeem_value: string
  luvi_growth_pct: string
}

export type ThorchainLiquidityProvidersResponseSuccess = LiquidityProvider[]

import { SwapSource, SwapperName } from "lib/swapper/api"

export const APPROVAL_GAS_LIMIT = '100000'
export const MAX_ONEINCH_TRADE = '100000000000000000000000000'
export const MIN_ONEINCH_VALUE_USD = 1
export const DEFAULT_SLIPPAGE = '0.002' // .2%
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SwapperName.OneInch, proportion: '1' }]
export const REFERRAL_ADDRESS = '0x90a48d5cf7343b08da12e067680b4c6dbfe551be' // DAO treasury?

import type { SwapSource } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

export const APPROVAL_GAS_LIMIT = '100000'
export const MAX_ONEINCH_TRADE = '100000000000000000000000000'
export const MIN_ONEINCH_VALUE_USD = 1
export const DEFAULT_SLIPPAGE = '0.002' // .2%
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SwapperName.OneInch, proportion: '1' }]
// TODO: How does this work for other chains, do we need multisigs on all the chains?
export const REFERRAL_ADDRESS = '0x90a48d5cf7343b08da12e067680b4c6dbfe551be' // DAO treasury?
export const WETH_ASSET_ID = 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
export const WAVAX_ASSET_ID = 'eip155:43114/erc20:0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
export const WBNB_ASSET_ID = 'eip155:56/erc20:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
export const WOP_ASSET_ID = 'eip155:10/erc20:0x4200000000000000000000000000000000000006'

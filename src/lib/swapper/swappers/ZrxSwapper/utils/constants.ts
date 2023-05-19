import type { SwapSource } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

export const MAX_ZRX_TRADE = '100000000000000000000000000'
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SwapperName.Zrx, proportion: '1' }]
export const AFFILIATE_ADDRESS = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const OPTIMISM_L1_SWAP_GAS_LIMIT = '50000'

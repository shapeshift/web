import type { SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'

export const APPROVAL_GAS_LIMIT = '100000'
export const MAX_ONEINCH_TRADE = '100000000000000000000000000'
export const MIN_ONEINCH_VALUE_USD = 1
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SwapperName.OneInch, proportion: '1' }]

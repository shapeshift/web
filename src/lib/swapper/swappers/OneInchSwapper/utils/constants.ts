import type { SwapSource } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

export const MIN_ONEINCH_VALUE_USD = 1
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SwapperName.OneInch, proportion: '1' }]

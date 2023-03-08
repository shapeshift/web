import type { SwapperName, SwapperType, SwapSource } from '@shapeshiftoss/swapper'

export const SWAPPER_TYPE: SwapperType = 'Li.Fi' as SwapperType // TODO: update @shapeshiftoss/swapper SwapperType
export const SWAPPER_NAME: SwapperName = 'Li.Fi' as SwapperName // TODO: update @shapeshiftoss/swapper SwapperName
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SWAPPER_NAME, proportion: '1' }]
export const MIN_AMOUNT_THRESHOLD_USD_HUMAN = 20 // arbitrary amount deemed by lifi devs to meet minimum amount across all brdiges
export const SELECTED_ROUTE_INDEX = 0 // default to first route - this is the highest ranking according to the query we send
export const LIFI_GAS_FEE_BASE = 16 // lifi gas feed are all in base 16
export const MAX_ALLOWANCE = '100000000000000000000000000'
export const MAX_LIFI_TRADE = '100000000000000000000000000'

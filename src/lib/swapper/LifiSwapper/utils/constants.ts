import type { SwapperName, SwapperType, SwapSource } from '@shapeshiftoss/swapper'

export const SWAPPER_TYPE: SwapperType = 'Li.Fi' as SwapperType // TODO: update @shapeshiftoss/swapper SwapperType
export const SWAPPER_NAME: SwapperName = 'Li.Fi' as SwapperName // TODO: update @shapeshiftoss/swapper SwapperName
export const DEFAULT_SOURCE: SwapSource[] = [{ name: SWAPPER_NAME, proportion: '1' }]

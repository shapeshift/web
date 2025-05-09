import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId } from '@shapeshiftoss/caip'

export * from './constants'
export * from './getThorTradeQuote/getTradeQuote'
export * from './getThorTradeRate/getTradeRate'
export * from './utils/poolAssetHelpers/poolAssetHelpers'

export const isCacao = (assetId: AssetId) => assetId === mayachainAssetId

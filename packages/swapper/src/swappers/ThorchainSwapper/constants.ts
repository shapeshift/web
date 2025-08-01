import { fromAssetId } from '@shapeshiftoss/caip'

import type { SwapSource } from '../../types'
import { SwapperName } from '../../types'
import { assetIdToThorPoolAssetIdMap } from './utils/poolAssetHelpers/poolAssetHelpers'

export const THORCHAIN_PRECISION = 8
export const THORCHAIN_AFFILIATE_NAME = 'ss'

export const THORCHAIN_SUPPORTED_CHAIN_IDS = [
  ...new Set(Object.keys(assetIdToThorPoolAssetIdMap).map(assetId => fromAssetId(assetId).chainId)),
]

export const THORCHAIN_STREAM_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Streaming`
export const THORCHAIN_LONGTAIL_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Long-tail`
export const THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE: SwapSource = `${SwapperName.Thorchain} • Long-tail streaming`

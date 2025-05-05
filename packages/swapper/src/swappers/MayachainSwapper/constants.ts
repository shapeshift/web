import { fromAssetId } from '@shapeshiftoss/caip'

import type { SupportedChainIds, SwapSource } from '../../types'
import { SwapperName } from '../../types'
import { assetIdToPoolAssetIdMap } from './utils/poolAssetHelpers/poolAssetHelpers'

export const MAYA_PRECISION = 8

export const MAYACHAIN_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: Object.keys(assetIdToPoolAssetIdMap).map(assetId => fromAssetId(assetId).chainId),
  buy: Object.keys(assetIdToPoolAssetIdMap).map(assetId => fromAssetId(assetId).chainId),
}

export const MAYACHAIN_STREAM_SWAP_SOURCE: SwapSource = `${SwapperName.Mayachain} • Streaming`

import { fromAssetId } from '@shapeshiftoss/caip'

import type { SwapSource } from '../../types'
import { SwapperName } from '../../types'
import { assetIdToMayaPoolAssetIdMap } from './utils/poolAssetHelpers/poolAssetHelpers'

export const CACAO_PRECISION = 10
export const MAYACHAIN_PRECISION = 8
export const MAYACHAIN_AFFILIATE_NAME = 'ssmaya'

export const MAYACHAIN_SUPPORTED_CHAIN_IDS = [
  ...new Set(Object.keys(assetIdToMayaPoolAssetIdMap).map(assetId => fromAssetId(assetId).chainId)),
]

export const MAYACHAIN_STREAM_SWAP_SOURCE: SwapSource = `${SwapperName.Mayachain} • Streaming`

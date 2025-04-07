import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { relayTokenToAssetId } from './relayTokenToAssetId'
import type { RelayToken } from './types'

export const relayTokenToAsset = (
  relayToken: RelayToken,
  assets: Partial<Record<AssetId, Asset>>,
): Result<Asset, SwapErrorRight> => {
  const assetId = relayTokenToAssetId(relayToken)
  const maybeAsset = assets[assetId]
  if (maybeAsset) return Ok(maybeAsset)

  return Err(
    makeSwapErrorRight({
      message: 'Unknown relay token',
    }),
  )
}

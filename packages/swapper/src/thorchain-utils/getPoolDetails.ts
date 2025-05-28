import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperName } from '../types'
import { getPoolAssetId } from './index'
import { thorService } from './service'
import type { ThornodePoolResponse } from './types'

type GetPoolDetailsArgs = {
  buyAsset: Asset
  sellAsset: Asset
  url: string
  swapperName: SwapperName
}

type PoolDetails = {
  buyPool?: ThornodePoolResponse
  buyPoolId?: string
  sellPool?: ThornodePoolResponse
  sellPoolId?: string
  streamingInterval: number
}

export const getPoolDetails = async (
  args: GetPoolDetailsArgs,
): Promise<Result<PoolDetails, SwapErrorRight>> => {
  const { buyAsset, sellAsset, url, swapperName } = args

  const res = await thorService.get<ThornodePoolResponse[]>(url)
  if (res.isErr()) return Err(res.unwrapErr())

  const { data: poolsResponse } = res.unwrap()

  const buyPoolId = getPoolAssetId({ assetId: buyAsset.assetId, swapperName })
  const sellPoolId = getPoolAssetId({ assetId: sellAsset.assetId, swapperName })

  const sellPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  const streamingInterval = (() => {
    // TODO: One of the pools is a native asset - use the as-is 10 until we work out how best to handle this
    if (!sellPool || !buyPool) return 10

    const sellAssetDepthBps = sellPool.derived_depth_bps
    const buyAssetDepthBps = buyPool.derived_depth_bps
    const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)

    // Low health for the pools of this swap - use a longer streaming interval
    if (swapDepthBps.lt(5000)) return 10

    // Moderate health for the pools of this swap - use a moderate streaming interval
    if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 5

    // Pool is at 90%+ health - use a 1 block streaming interval
    return 1
  })()

  return Ok({ buyPoolId, buyPool, sellPoolId, sellPool, streamingInterval })
}

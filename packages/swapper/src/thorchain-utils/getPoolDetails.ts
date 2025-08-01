import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../types'
import { SwapperName } from '../types'
import { getPoolAssetId, isNativeAsset } from './index'
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
    // https://discord.com/channels/915368890475880468/1105576530354118706/1270235165062594560
    if (swapperName === SwapperName.Mayachain) return 3

    const sellAssetDepthBps = (() => {
      // Sell pool is the same as buy pool if selling native fee asset
      if (isNativeAsset(sellAsset.assetId, swapperName)) return buyPool?.derived_depth_bps
      return sellPool?.derived_depth_bps
    })()

    const buyAssetDepthBps = (() => {
      // Buy pool is the same as sell pool if buying native fee asset
      if (isNativeAsset(buyAsset.assetId, swapperName)) return sellPool?.derived_depth_bps
      return buyPool?.derived_depth_bps
    })()

    if (sellAssetDepthBps && buyAssetDepthBps) {
      const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)

      // Low health for the pools of this swap - use a longer streaming interval
      if (swapDepthBps.lt(5000)) return 10

      // Moderate health for the pools of this swap - use a moderate streaming interval
      if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 5

      // Pool is at 90%+ health - use a 1 block streaming interval
      return 1
    }

    // Default streaming interval if derived depth bps are not available
    return 10
  })()

  return Ok({ buyPoolId, buyPool, sellPoolId, sellPool, streamingInterval })
}

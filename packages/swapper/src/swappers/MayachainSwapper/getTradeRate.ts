import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { ThornodePoolResponse, ThorTradeRate } from '../../thorchain-utils'
import { getL1RateOrQuote, thorService, TradeType } from '../../thorchain-utils'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps } from '../../types'
import { SwapperName } from '../../types'
import { assertValidTrade, assetIdToPoolAssetId } from './utils'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
  const { sellAsset, buyAsset } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const url = `${deps.config.VITE_MAYACHAIN_NODE_URL}/mayachain/pools`

  const res = await thorService.get<ThornodePoolResponse[]>(url)
  if (res.isErr()) return Err(res.unwrapErr())

  const { data: poolsResponse } = res.unwrap()

  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAsset.assetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  const sellAssetPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyAssetPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  const streamingInterval = (() => {
    if (sellAssetPool && buyAssetPool) {
      const sellAssetDepthBps = sellAssetPool.derived_depth_bps
      const buyAssetDepthBps = buyAssetPool.derived_depth_bps
      const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)

      // Low health for the pools of this swap - use a longer streaming interval
      if (swapDepthBps.lt(5000)) return 10

      // Moderate health for the pools of this swap - use a moderate streaming interval
      if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 5

      // Pool is at 90%+ health - use a 1 block streaming interval
      return 1
    }

    // TODO: One of the pools is RUNE - use the as-is 10 until we work out how best to handle this
    return 10
  })()

  return getL1RateOrQuote<ThorTradeRate>(
    input,
    deps,
    streamingInterval,
    TradeType.L1ToL1,
    SwapperName.Mayachain,
  )
}

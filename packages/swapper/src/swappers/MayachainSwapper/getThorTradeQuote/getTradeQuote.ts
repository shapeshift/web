import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { ThornodePoolResponse, ThorTradeQuote } from '../../../thorchain-utils'
import { service, TradeType } from '../../../thorchain-utils'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { getL1Quote } from '../../ThorchainSwapper/utils/getL1quote'
import { assertValidTrade } from '../utils'
import { assetIdToPoolAssetId } from '../utils/poolAssetHelpers/poolAssetHelpers'

export const isThorTradeQuote = (quote: TradeQuote | undefined): quote is ThorTradeQuote =>
  !!quote && 'tradeType' in quote && 'vault' in quote

export const getThorTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, buyAsset } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const url = `${deps.config.VITE_MAYACHAIN_NODE_URL}/lcd/mayachain/pools`

  const res = await service.get<ThornodePoolResponse[]>(url)
  if (res.isErr()) return Err(res.unwrapErr())

  const { data: poolsResponse } = res.unwrap()

  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAsset.assetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  // If one or both of these are undefined it means we are tradeing one or more long-tail ERC20 tokens
  const sellAssetPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyAssetPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  const streamingInterval =
    sellAssetPool && buyAssetPool
      ? (() => {
          const sellAssetDepthBps = sellAssetPool.derived_depth_bps
          const buyAssetDepthBps = buyAssetPool.derived_depth_bps
          const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)
          // Low health for the pools of this swap - use a longer streaming interval
          if (swapDepthBps.lt(5000)) return 10
          // Moderate health for the pools of this swap - use a moderate streaming interval
          if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 5
          // Pool is at 90%+ health - use a 1 block streaming interval
          return 1
        })()
      : // TODO: One of the pools is RUNE - use the as-is 10 until we work out how best to handle this
        10

  return getL1Quote(input, deps, streamingInterval, TradeType.L1ToL1)
}

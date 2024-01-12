import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight } from '@shapeshiftoss/swapper'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import { assertUnreachable } from 'lib/utils'

import type { ThornodePoolResponse } from '../types'
import { getL1quote } from '../utils/getL1quote'
import { getLongtailToL1Quote } from '../utils/getLongtailQuote'
import { getTradeType, TradeType } from '../utils/longTailHelpers'
import { assetIdToPoolAssetId } from '../utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from '../utils/thorService'

type ThorTradeQuoteSpecificMetadata = {
  isStreaming: boolean
  memo: string
  recommendedMinimumCryptoBaseUnit: string
}
export type ThorEvmTradeQuote = TradeQuote &
  ThorTradeQuoteSpecificMetadata & {
    router: string
    data: string
    tradeType: TradeType
  }

export type ThorTradeUtxoOrCosmosQuote = TradeQuote & ThorTradeQuoteSpecificMetadata
export type ThorTradeQuote = ThorEvmTradeQuote | ThorTradeUtxoOrCosmosQuote

export const getThorTradeQuote = async (
  input: GetTradeQuoteInput,
  assetsById: AssetsByIdPartial,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const thorchainSwapLongtailEnabled = getConfig().REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL
  const { sellAsset, buyAsset } = input

  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybePoolsResponse = await thorService.get<ThornodePoolResponse[]>(
    `${daemonUrl}/lcd/thorchain/pools`,
  )

  if (maybePoolsResponse.isErr()) return Err(maybePoolsResponse.unwrapErr())

  const { data: poolsResponse } = maybePoolsResponse.unwrap()

  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAsset.assetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  // If one or both of these are undefined it means we are tradeing one or more long-tail ERC20 tokens
  const sellAssetPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyAssetPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  const tradeType = thorchainSwapLongtailEnabled
    ? getTradeType(sellAssetPool, buyAssetPool, sellPoolId, buyPoolId)
    : TradeType.L1ToL1
  if (tradeType === undefined) return Err(makeSwapErrorRight({ message: 'Unknown trade type' }))

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

  switch (tradeType) {
    case TradeType.L1ToL1:
      return getL1quote(input, streamingInterval, tradeType)
    case TradeType.LongTailToL1:
      return getLongtailToL1Quote(input, streamingInterval, assetsById)
    case TradeType.LongTailToLongTail:
    case TradeType.L1ToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    default:
      assertUnreachable(tradeType)
  }
}

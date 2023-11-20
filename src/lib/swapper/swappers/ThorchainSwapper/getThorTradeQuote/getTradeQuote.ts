import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/types'
import { SwapErrorType } from 'lib/swapper/types'
import { makeSwapErrorRight } from 'lib/swapper/utils'
import { assertUnreachable } from 'lib/utils'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'

import type { ThornodePoolResponse } from '../types'
import { getL1quote } from '../utils/getL1quote'
import { getLongtailToL1Quote } from '../utils/getLongtailQuote'
import { getTradeType, TradeType } from '../utils/longTailHelpers'
import { assetIdToPoolAssetId } from '../utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from '../utils/thorService'

export type ThorEvmTradeQuote = TradeQuote &
  ThorTradeQuoteSpecificMetadata & {
    router: string
    data: string
  }

type ThorTradeQuoteSpecificMetadata = { isStreaming: boolean; memo: string }
type ThorTradeQuoteBase = TradeQuote | ThorEvmTradeQuote
export type ThorTradeQuote = ThorTradeQuoteBase & ThorTradeQuoteSpecificMetadata

export const getThorTradeQuote = async (
  input: GetTradeQuoteInput,
  assetsById: AssetsById,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const thorchainSwapLongtailEnabled = getConfig().REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL
  const { sellAsset, buyAsset, chainId, receiveAddress } = input

  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  const chainAdapterManager = getChainAdapterManager()
  const sellAdapter = chainAdapterManager.get(chainId)
  const buyAdapter = chainAdapterManager.get(buyAssetChainId)

  if (!sellAdapter || !buyAdapter) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId: chainId, buyAssetChainId },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote]: receiveAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

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
      return getL1quote(input, streamingInterval)
    case TradeType.LongTailToL1:
      return getLongtailToL1Quote(input, streamingInterval, assetsById)
    case TradeType.LongTailToLongTail:
    case TradeType.L1ToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    default:
      assertUnreachable(tradeType)
  }
}

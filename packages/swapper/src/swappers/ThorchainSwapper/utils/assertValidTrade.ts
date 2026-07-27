import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getPoolDetails, TradeType } from '../../../utils/thorchain'
import { THORCHAIN_SUPPORTED_CHAIN_IDS } from '../constants'
import { getTradeType } from './longTailHelpers'

export const assertValidTrade = async ({
  sellAsset,
  buyAsset,
  deps,
}: {
  sellAsset: Asset
  buyAsset: Asset
  deps: SwapperDeps
}): Promise<Result<{ tradeType: TradeType; streamingInterval: number }, SwapErrorRight>> => {
  if (
    !THORCHAIN_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId) ||
    !THORCHAIN_SUPPORTED_CHAIN_IDS.includes(buyAsset.chainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: 'Unsupported chain',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const poolDetails = await getPoolDetails({
    buyAsset,
    sellAsset,
    url: `${deps.config.VITE_THORCHAIN_NODE_URL}/thorchain/pools`,
    swapperName: SwapperName.Thorchain,
  })

  if (poolDetails.isErr()) return Err(poolDetails.unwrapErr())
  const { buyPool, buyPoolId, sellPool, sellPoolId, streamingInterval } = poolDetails.unwrap()

  const tradeType = deps.config.VITE_FEATURE_THORCHAINSWAP_LONGTAIL
    ? getTradeType(sellPool, buyPool, sellPoolId, buyPoolId)
    : TradeType.L1ToL1

  if (tradeType === undefined) {
    return Err(
      makeSwapErrorRight({
        message: 'Unknown trade type',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (
    (!buyPoolId && tradeType !== TradeType.L1ToLongTail) ||
    (!sellPoolId && tradeType !== TradeType.LongTailToL1)
  ) {
    return Err(
      makeSwapErrorRight({
        message: 'Unsupported trade pair',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok({ tradeType, streamingInterval })
}

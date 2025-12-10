import type { AssetId } from '@shapeshiftoss/caip'
import { suiAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { ProtocolFee, SwapErrorRight, SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { isSupportedChainId } from '../utils/constants'
import { findBestRoute, getAggregatorClient, getCoinType } from '../utils/helpers'

type CetusTradeDataInput = {
  sellAsset: Asset
  buyAsset: Asset
  receiveAddress: string | undefined
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
}

type CetusTradeData = {
  buyAmountAfterFeesCryptoBaseUnit: string
  rate: string
  addressForFeeEstimate: string
  sellCoinType: string
  protocolFees: Record<AssetId, ProtocolFee>
  adapter: ReturnType<SwapperDeps['assertGetSuiChainAdapter']>
}

export const getCetusTradeData = async (
  input: CetusTradeDataInput,
  deps: SwapperDeps,
): Promise<Result<CetusTradeData, SwapErrorRight>> => {
  const { sellAsset, buyAsset, receiveAddress, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
    input

  const { assetsById } = deps

  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  const suiAsset = assetsById[suiAssetId]

  if (!suiAsset) {
    return Err(
      makeSwapErrorRight({
        message: `suiAsset is required`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  try {
    const adapter = deps.assertGetSuiChainAdapter(sellAsset.chainId)
    const rpcUrl = deps.config.VITE_SUI_NODE_URL
    const client = getAggregatorClient(rpcUrl)

    const sellCoinType = getCoinType(sellAsset)
    const buyCoinType = getCoinType(buyAsset)

    const routerData = await findBestRoute(
      client,
      sellCoinType,
      buyCoinType,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
    )

    if (!routerData) {
      return Err(
        makeSwapErrorRight({
          message: `No route found for ${sellAsset.symbol}/${buyAsset.symbol}`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const buyAmountAfterFeesCryptoBaseUnit = routerData.amountOut.toString()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const dummyAddress = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const addressForFeeEstimate = receiveAddress ?? dummyAddress

    const protocolFees: Record<AssetId, ProtocolFee> = {}

    return Ok({
      buyAmountAfterFeesCryptoBaseUnit,
      rate,
      addressForFeeEstimate,
      sellCoinType,
      protocolFees,
      adapter,
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Cetus data',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

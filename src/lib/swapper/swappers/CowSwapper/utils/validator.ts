import { Result, Ok, Err } from "@sniptt/monads/build"
import { Asset } from "../../../../../../packages/asset-service/dist"
import { SwapErrorRight, makeSwapErrorRight, SwapErrorType } from "../../../../../../packages/swapper/dist"
import { CowswapSupportedChainAdapter } from "../types"
import { fromAssetId } from "@shapeshiftoss/caip"
import { isCowswapSupportedChainId } from "./utils"



export const assertValidTradePair = ({
    buyAsset,
    sellAsset,
    adapter,
  }: {
    buyAsset: Asset
    sellAsset: Asset
    adapter: CowswapSupportedChainAdapter
  }): Result<boolean, SwapErrorRight> => {
    const chainId = adapter.getChainId()
  
    if (buyAsset.chainId === chainId && sellAsset.chainId === chainId) return Ok(true)
  
    return Err(
      makeSwapErrorRight({
        message: `[assertValidTradePair] - both assets must be on chainId ${chainId}`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: {
          buyAssetChainId: buyAsset.chainId,
          sellAssetChainId: sellAsset.chainId,
        },
      }),
    )
  }

export const validateTradePair = ({sellAsset, buyAsset}) => {


  if (!receiveAddress)
  return Err(
    makeSwapErrorRight({
      message: 'Receive address is required to build CoW trades',
      code: SwapErrorType.MISSING_INPUT,
    }),
  )

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } = fromAssetId(
        sellAsset.assetId,
      )
    
      const { assetReference: buyAssetErc20Address, chainId: buyAssetChainId } = fromAssetId(
        buyAsset.assetId,
      )
    
      if (sellAssetNamespace !== 'erc20') {
        return Err(
          makeSwapErrorRight({
            message: '[getCowSwapTradeQuote] - Sell asset needs to be ERC-20 to use CowSwap',
            code: SwapErrorType.UNSUPPORTED_PAIR,
            details: { sellAssetNamespace },
          }),
        )
      }
    
      if (!isCowswapSupportedChainId(buyAssetChainId)) {
        return Err(
          makeSwapErrorRight({
            message: '[getCowSwapTradeQuote] - Buy asset network not supported by CowSwap',
            code: SwapErrorType.UNSUPPORTED_PAIR,
            details: { buyAssetChainId },
          }),
        )
      }
}
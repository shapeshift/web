import { Err, Result } from "@sniptt/monads";
import { KnownChainIds } from "@shapeshiftoss/types";

import {
    GetTradeQuoteInput,
    SwapErrorRight,
    SwapperDeps,
    TradeQuote,
    TradeQuoteError
} from "../../../types";
import { makeSwapErrorRight } from "../../../utils";
import { chainIdToChainflipNetwork } from "../constants";
import { isSupportedChainId, isSupportedAsset } from "../utils/helpers";

export const getChainflipTradeQuote = async (
    input: GetTradeQuoteInput,
    deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    // affiliateBps,
  } = input
  
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
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedAsset(sellAsset.chainId, sellAsset.symbol)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: sellAsset.chainId, assetId: sellAsset.assetId },
      }),
    )
  }

  if (!isSupportedAsset(buyAsset.chainId, buyAsset.symbol)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: buyAsset.chainId, assetId: buyAsset.assetId },
      }),
    )
  }

  // @ts-ignore
  const sellChainflipChainKey = `${sellAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[sellAsset.chainId as KnownChainIds]}`;
  // @ts-ignore
  const buyChainflipChainKey = `${buyAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[buyAsset.chainId as KnownChainIds]}`;

  // @ts-ignore
  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  // TODO: Build the quote request
    
  // TODO: Temp error  
  return Err(
    makeSwapErrorRight({
      message: 'Unsupported chain',
      code: TradeQuoteError.UnsupportedChain,
    }),
  )
}
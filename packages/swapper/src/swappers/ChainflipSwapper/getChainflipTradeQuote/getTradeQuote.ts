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

export const getChainflipTradeQuote = async (
    input: GetTradeQuoteInput,
    deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    // affiliateBps,
  } = input
  
  // TODO: Add checking on support network and asset  
    
  const sellChainflipChainKey = `${sellAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[sellAsset.chainId as KnownChainIds]}`;
  const buyChainflipChainKey = `${buyAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[buyAsset.chainId as KnownChainIds]}`;

  // if (sellChainflipChainKey === undefined) {
  //   return Err(
  //     makeSwapErrorRight({
  //       message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
  //       code: TradeQuoteError.UnsupportedTradePair,
  //     }),
  //   )
  // }
  // if (buyChainflipChainKey === undefined) {
  //   return Err(
  //     makeSwapErrorRight({
  //       message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
  //       code: TradeQuoteError.UnsupportedTradePair,
  //     }),
  //   )
  // }
    
  // @ts-ignore
  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  // TODO: use the generated swagger client to get a quote
  // TODO: How to get packages/unchained-client/dist/generated/chainflip in here?   
    
  // TODO: Temp error  
  return Err(
    makeSwapErrorRight({
      message: 'Unsupported chain',
      code: TradeQuoteError.UnsupportedChain,
    }),
  )
}
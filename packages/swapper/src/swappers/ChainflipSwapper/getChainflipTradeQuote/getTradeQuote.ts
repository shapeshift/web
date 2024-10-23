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
import { chainflipService } from "../utils/chainflipService";
import { ChainflipBaasQuoteQuote } from "../models";

export const getChainflipTradeQuote = async (
    input: GetTradeQuoteInput,
    deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset, 
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps: commissionBps,
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

  const sellChainflipChainKey = `${sellAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[sellAsset.chainId as KnownChainIds]}`;
  const buyChainflipChainKey = `${buyAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[buyAsset.chainId as KnownChainIds]}`;

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY; 

    // @ts-ignore
  const maybeQuoteResponse = await chainflipService.get<ChainflipBaasQuoteQuote[]>(
    `${brokerUrl}/quotes-native?apiKey=${apiKey}&sourceAsset=${sellChainflipChainKey}&destinationAsset=${buyChainflipChainKey}&amount=${sellAmount}&commissionBps=${commissionBps}`,
  );

  //if (maybeQuoteResponse.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: 'Quote request failed',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  //}
}
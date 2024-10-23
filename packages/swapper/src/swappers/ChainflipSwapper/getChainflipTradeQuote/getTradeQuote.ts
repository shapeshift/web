import {GetTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote, TradeQuoteError} from "../../../types";
import {Err, Result} from "@sniptt/monads";
import {makeSwapErrorRight} from "../../../utils";
import {buySupportedChainIds, sellSupportedChainIds} from "../../ThorchainSwapper/constants";

export const getChainflipTradeQuote = async (
    input: GetTradeQuoteInput,
    deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sellAsset, buyAsset } = input
    
  if (!sellSupportedChainIds[sellAsset.chainId] || !buySupportedChainIds[buyAsset.chainId]) {
    return Err(
      makeSwapErrorRight({
        message: 'Unsupported chain',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // @ts-ignore
  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  // TODO: use the generated swagger client to get a quote

  return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
}
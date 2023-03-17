import type { BridgeDefinition, ChainKey, Token } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { BuildTradeInput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { getTradeQuote } from 'lib/swapper/LifiSwapper/getTradeQuote/getTradeQuote'
import { isGetEvmTradeQuoteInput } from 'lib/swapper/LifiSwapper/utils/isGetEvmTradeQuoteInput/isGetEvmTradeQuoteInput'
import type { LifiTrade } from 'lib/swapper/LifiSwapper/utils/types'

export const buildTrade = async (
  input: BuildTradeInput,
  lifiAssetMap: Map<AssetId, Token>,
  lifiChainMap: Map<ChainId, ChainKey>,
  lifiBridges: BridgeDefinition[],
): Promise<LifiTrade> => {
  if (!isGetEvmTradeQuoteInput(input)) {
    throw new SwapError('[buildTrade] - only EVM chains are supported', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: input,
    })
  }

  // TODO: determine whether we should be fetching another quote like below or modify `executeTrade.ts`
  // to allow passing the existing quote in.
  const {
    buyAmountCryptoBaseUnit,
    sellAmountBeforeFeesCryptoBaseUnit,
    feeData,
    rate,
    sources,
    buyAsset,
    sellAsset,
    accountNumber,
    routesRequest,
  } = await getTradeQuote(input, lifiAssetMap, lifiChainMap, lifiBridges)

  return {
    buyAmountCryptoBaseUnit,
    sellAmountBeforeFeesCryptoBaseUnit,
    feeData,
    rate,
    sources,
    buyAsset,
    sellAsset,
    accountNumber,
    routesRequest,
    receiveAddress: input.receiveAddress,
  }
}

import type { ChainKey, Token } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { BuildTradeInput, SwapErrorRight } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getTradeQuote } from 'lib/swapper/LifiSwapper/getTradeQuote/getTradeQuote'
import { isGetEvmTradeQuoteInput } from 'lib/swapper/LifiSwapper/utils/isGetEvmTradeQuoteInput/isGetEvmTradeQuoteInput'

import type { LifiTrade } from '../utils/types'

export const buildTrade = async (
  input: BuildTradeInput,
  lifiAssetMap: Map<AssetId, Token>,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTrade, SwapErrorRight>> => {
  if (!isGetEvmTradeQuoteInput(input)) {
    throw new SwapError('[buildTrade] - only EVM chains are supported', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: input,
    })
  }

  const maybeTradeQuote = await getTradeQuote(input, lifiAssetMap, lifiChainMap)
  if (maybeTradeQuote.isErr()) return Err(maybeTradeQuote.unwrapErr())
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
    selectedLifiRoute,
  } = maybeTradeQuote.unwrap()

  return Ok({
    buyAmountCryptoBaseUnit,
    sellAmountBeforeFeesCryptoBaseUnit,
    feeData,
    rate,
    sources,
    buyAsset,
    sellAsset,
    accountNumber,
    receiveAddress: input.receiveAddress,
    selectedLifiRoute,
  })
}

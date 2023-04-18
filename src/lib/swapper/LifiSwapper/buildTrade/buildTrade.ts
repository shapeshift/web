import type { ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { BuildTradeInput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { getTradeQuote } from 'lib/swapper/LifiSwapper/getTradeQuote/getTradeQuote'
import { isGetEvmTradeQuoteInput } from 'lib/swapper/LifiSwapper/utils/isGetEvmTradeQuoteInput/isGetEvmTradeQuoteInput'

import type { LifiTrade } from '../utils/types'

export const buildTrade = async (
  input: BuildTradeInput,
  lifiChainMap: Map<ChainId, ChainKey>,
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
    selectedLifiRoute,
  } = await getTradeQuote(input, lifiChainMap)

  return {
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
  }
}

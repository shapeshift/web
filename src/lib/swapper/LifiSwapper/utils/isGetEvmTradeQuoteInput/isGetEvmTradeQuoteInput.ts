import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, GetTradeQuoteInput } from '@shapeshiftoss/swapper'

export const isGetEvmTradeQuoteInput = (
  input: GetTradeQuoteInput,
): input is GetEvmTradeQuoteInput => {
  return isEvmChainId(input.chainId)
}

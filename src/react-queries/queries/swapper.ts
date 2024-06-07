import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { ChainId } from '@shapeshiftoss/caip'
import type { GetEvmTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'

export type ArbitrumBridgeTradeQuoteInput = Omit<
  GetEvmTradeQuoteInput,
  'supportsEIP1559' | 'sellAsset' | 'buyAsset' | 'accountNumber' | 'chainId'
> & {
  sellAsset: Asset | undefined
  buyAsset: Asset | undefined
  accountNumber: number | undefined
  chainId: ChainId | undefined
}

// Only used for arbitrum bridge swapper use outside of swapper for now
export const swapper = createQueryKeys('swapper', {
  arbitrumBridgeTradeQuote: (input: ArbitrumBridgeTradeQuoteInput) => {
    return {
      queryKey: [input],
    }
  },
  arbitrumBridgeTradeStatus: (txHash: string | undefined, chainId: ChainId | undefined) => ({
    queryKey: [txHash, chainId],
  }),
})

import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { ChainId } from '@shapeshiftmonorepo/caip'
import type { GetEvmTradeQuoteInput } from '@shapeshiftmonorepo/swapper'
import type { Asset } from '@shapeshiftmonorepo/types'

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

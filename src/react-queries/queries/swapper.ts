import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { ChainId } from '@shapeshiftoss/caip'
import { type HDWallet, supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { GetEvmTradeQuoteInput } from '@shapeshiftoss/swapper'
import { arbitrumBridgeApi } from 'lib/swapper/swappers/ArbitrumBridgeSwapper/endpoints'
import { getTradeQuote } from 'lib/swapper/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'

// Feature-agnostic, abstracts away THORNode endpoints
export const swapper = createQueryKeys('swapper', {
  arbitrumBridgeTradeQuote: (
    inputWithWallet: Omit<GetEvmTradeQuoteInput, 'supportsEIP1559'> & { wallet: HDWallet },
  ) => {
    const { wallet, ...input } = inputWithWallet
    return {
      queryKey: ['arbitrumBridgeTradeQuote', input],
      queryFn: async () => {
        const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

        return getTradeQuote({ ...input, supportsEIP1559 })
      },
    }
  },
  arbitrumBridgeTradeStatus: (txHash: string, chainId: ChainId) => ({
    queryKey: ['arbitrumBridgeTradeStatus', txHash, chainId],
    queryFn: () =>
      arbitrumBridgeApi.checkTradeStatus({
        txHash,
        chainId,
        quoteId: '',
        stepIndex: 0,
      }),
  }),
})

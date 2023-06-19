import type { ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Swapper3 } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getUnsignedTx } from 'lib/swapper/swappers/LifiSwapper/getUnsignedTx/getUnsignedTx'

import type { LifiTradeQuote } from './utils/types'

export const lifi: Swapper3 = {
  getUnsignedTx: async (tradeQuote: LifiTradeQuote<false>, wallet: HDWallet) => {
    const { selectedLifiRoute } = tradeQuote
    const { accountNumber, sellAsset } = tradeQuote.steps[0]

    const unsignedTx = await getUnsignedTx({
      selectedLifiRoute,
      accountNumber,
      sellAsset,
      wallet,
    })

    return unsignedTx
  },
  executeTrade: async ({ txToExecute, wallet, chainId }) => {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as ChainAdapter<EvmChainId>

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign: txToExecute, wallet })

      const txid = await adapter.broadcastTransaction(signedTx)

      return Ok(txid)
    }

    if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txToExecute,
        wallet,
      })

      return Ok(txid)
    }

    return Err(
      makeSwapErrorRight({
        message: '[executeTrade] - sign and broadcast failed',
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      }),
    )
  },
}

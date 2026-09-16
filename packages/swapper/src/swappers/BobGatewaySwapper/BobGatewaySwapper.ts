import type { Swapper } from '../../types'
import { executeEvmTransaction, executeTronTransaction, getSwapMetadata } from '../../utils'
import { registerBobGatewayTx } from './utils/helpers'

export const bobGatewaySwapper: Swapper = {
  executeEvmTransaction,
  // BTC deposits are signed locally and handed to the gateway, which broadcasts them
  executeUtxoTransaction: async (txToSign, { signTransaction }, { config, swapperMetadata }) => {
    if (!signTransaction) throw new Error('[BobGateway] signTransaction is required for btc sells')

    const { orderId } = getSwapMetadata(swapperMetadata, 'bob')
    const bitcoinTxHex = await signTransaction(txToSign)

    return registerBobGatewayTx({ config, orderId, bitcoinTxHex })
  },
  executeTronTransaction,
}

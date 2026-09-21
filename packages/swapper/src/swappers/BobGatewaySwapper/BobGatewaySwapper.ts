import type { Swapper } from '../../types'
import { executeEvmTransaction, executeTronTransaction, getSwapMetadata } from '../../utils'
import { submitBobGatewayBtcDeposit } from './utils/helpers'

export const bobGatewaySwapper: Swapper = {
  executeEvmTransaction,
  executeUtxoTransaction: async (txToSign, { signTransaction }, context) => {
    if (!signTransaction) throw new Error('[BobGateway] signTransaction is required')
    if (!context) throw new Error('[BobGateway] execution context is required')

    const { orderId } = getSwapMetadata(context.swapperMetadata, 'bob')
    const bitcoinTxHex = await signTransaction(txToSign)
    return submitBobGatewayBtcDeposit({ config: context.config, orderId, bitcoinTxHex })
  },
  executeTronTransaction,
}

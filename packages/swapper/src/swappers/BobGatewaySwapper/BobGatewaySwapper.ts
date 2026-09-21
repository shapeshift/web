import type { Swapper } from '../../types'
import { executeEvmTransaction, executeTronTransaction, getSwapMetadata } from '../../utils'
import { submitBobGatewayBtcDeposit } from './utils/helpers'

export const bobGatewaySwapper: Swapper = {
  executeEvmTransaction,
  executeUtxoTransaction: async (txToSign, { signTransaction }, { config, swapperMetadata }) => {
    const { orderId } = getSwapMetadata(swapperMetadata, 'bob')
    const bitcoinTxHex = await signTransaction(txToSign)
    return submitBobGatewayBtcDeposit({ config, orderId, bitcoinTxHex })
  },
  executeTronTransaction,
}

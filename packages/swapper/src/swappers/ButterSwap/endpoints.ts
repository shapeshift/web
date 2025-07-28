import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from '@shapeshiftoss/utils'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus,
  getUnsignedEvmTransaction: async args => {
    const { from, stepIndex, tradeQuote, supportsEIP1559, assertGetEvmChainAdapter } = args
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')
    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { sellAsset, butterSwapTransactionMetadata } = step
    const { chainNamespace } = fromChainId(sellAsset.chainId)
    if (chainNamespace !== CHAIN_NAMESPACE.Evm) {
      throw new Error(`getUnsignedEvmTransaction called for non-EVM chain: ${chainNamespace}`)
    }
    const { accountNumber } = step
    if (!butterSwapTransactionMetadata) throw new Error('Transaction metadata is required')
    const { to, value, data } = butterSwapTransactionMetadata
    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value: BigInt(value).toString(),
      from,
      supportsEIP1559,
    })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value: BigInt(value).toString(),
      ...feeData,
      // Add 15% buffer to account for gas estimation inaccuracies in cross-chain swaps
      gasLimit: bnOrZero(feeData.gasLimit).times(1.15).toFixed(),
    })
  },
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,
}

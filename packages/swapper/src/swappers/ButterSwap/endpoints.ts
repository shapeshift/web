import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus,
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { butterSwapTransactionMetadata, sellAsset } = step
    if (!butterSwapTransactionMetadata) throw new Error('Transaction metadata is required')

    const { to, data, gasLimit, value } = butterSwapTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value: BigInt(value).toString(),
      from,
      supportsEIP1559,
    })

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      gasLimit,
      gasPrice: feeData.gasPrice ?? '0',
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      supportsEIP1559,
    })

    return BigNumber.max(feeData.networkFeeCryptoBaseUnit, networkFeeCryptoBaseUnit).toFixed()
  },
  getUnsignedEvmTransaction: async args => {
    const { from, stepIndex, tradeQuote, supportsEIP1559, assertGetEvmChainAdapter } = args

    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, butterSwapTransactionMetadata } = step
    if (!butterSwapTransactionMetadata) throw new Error('Transaction metadata is required')

    const { to, data, gasLimit, value } = butterSwapTransactionMetadata

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
      gasLimit: BigNumber.max(feeData.gasLimit, gasLimit).toFixed(),
    })
  },
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,
  getUnsignedTronTransaction,
  getTronTransactionFees,
}

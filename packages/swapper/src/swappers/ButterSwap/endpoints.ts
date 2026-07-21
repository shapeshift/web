import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.6 }

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus,
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction: async ({
    stepIndex,
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, sellAsset, transactionData } = step
    if (transactionData?.type !== 'utxo') throw new Error('invalid utxo transaction')

    const { to, opReturnData, value } = transactionData

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to,
      value,
      chainSpecific: { pubkey: xpub, opReturnData },
      sendMax: false,
    })

    return adapter.buildSendApiTransaction({
      value,
      xpub,
      to,
      accountNumber,
      chainSpecific: {
        accountType,
        opReturnData,
        satoshiPerByte: fast.chainSpecific.satoshiPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({ stepIndex, tradeQuote, xpub, assertGetUtxoChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { sellAsset, transactionData } = step
    if (transactionData?.type !== 'utxo') throw new Error('invalid utxo transaction')

    const { to, opReturnData, value } = transactionData

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to,
      value,
      chainSpecific: { pubkey: xpub, opReturnData },
      sendMax: false,
    })

    return fast.txFee
  },
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, solanaComputeBudget)
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getTronTransactionFees,
  getUnsignedTronTransaction,
}

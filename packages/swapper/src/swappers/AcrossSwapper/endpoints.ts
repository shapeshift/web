import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { acrossService } from './utils/acrossService'
import type {
  AcrossDepositStatus,
  AcrossTradeQuoteInput,
  AcrossTradeRateInput,
} from './utils/types'

const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.6 }

export const acrossApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as AcrossTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as AcrossTradeRateInput, deps),
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { transactionData, sellAsset } = step
    if (transactionData?.type !== 'evm') throw new Error('[Across] invalid evm transaction')

    const { to, value, data } = transactionData

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, transactionData, sellAsset } = step
    if (transactionData?.type !== 'evm') throw new Error('[Across] invalid evm transaction')

    const { to, value, data } = transactionData

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    const unsignedTx = await adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      gasLimit: BigNumber.max(transactionData.gasLimit ?? '0', feeData.gasLimit).toFixed(),
    })

    return unsignedTx
  },
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    if (isEvmChainId(chainId)) {
      const sourceTxStatus = await checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

      txHash = sourceTxStatus.buyTxHash ?? txHash
    }

    const maybeStatusResponse = await acrossService.get<AcrossDepositStatus>(
      `${config.VITE_ACROSS_API_URL}/deposit/status?depositTxnRef=${txHash}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'filled':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'slowFillRequested':
          return TxStatus.Pending
        case 'expired':
          return TxStatus.Failed
        case 'refunded':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    const message = (() => {
      switch (statusResponse.status) {
        case 'pending':
          return 'Deposit detected, processing...'
        case 'slowFillRequested':
          return 'Taking longer than usual, waiting for fill...'
        case 'expired':
          return 'Deposit expired'
        case 'refunded':
          return 'Deposit refunded on origin chain'
        default:
          return undefined
      }
    })()

    const buyTxHash = statusResponse.fillTxnRef

    return {
      status,
      buyTxHash,
      message,
    }
  },
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, solanaComputeBudget)
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
}

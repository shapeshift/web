import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import { ComputeBudgetProgram } from '@solana/web3.js'
import BigNumber from 'bignumber.js'

import { COMPUTE_UNIT_MARGIN_MULTIPLIER } from '../../swappers/JupiterSwapper'
import type { GetUnsignedSolanaTransactionArgs, SwapperApi } from '../../types'
import {
  checkSafeTransactionStatus,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { acrossService } from './utils/acrossService'
import type { AcrossDepositStatus } from './utils/types'

export const acrossApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input, deps),
  getTradeRate: (input, deps) => getTradeRate(input, deps),
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { acrossTransactionMetadata, sellAsset } = step
    if (!acrossTransactionMetadata) throw new Error('Missing Across transaction metadata')

    const { to, value, data } = acrossTransactionMetadata

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

    const { accountNumber, acrossTransactionMetadata, sellAsset } = step
    if (!acrossTransactionMetadata) throw new Error('Missing Across transaction metadata')

    const { to, value, data, gasLimit: gasLimitFromApi } = acrossTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    const unsignedTx = await adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      gasLimit: BigNumber.max(gasLimitFromApi ?? '0', feeData.gasLimit).toFixed(),
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
      const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
        txHash,
        chainId,
        assertGetEvmChainAdapter,
        address,
        fetchIsSmartContractAddressQuery,
      })

      if (maybeSafeTransactionStatus) {
        if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus
        txHash = maybeSafeTransactionStatus.buyTxHash
      }
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
  getUnsignedSolanaTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, solanaTransactionMetadata, sellAsset } = step

    if (!solanaTransactionMetadata) throw new Error('Missing Solana transaction metadata')

    const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

    // Across pre-built transactions already include ComputeBudget instructions.
    // The standard pipeline (buildSendApiTransaction → solanaBuildTransaction) adds its own,
    // causing duplicates. Strip them from the decompiled instructions so the pipeline
    // can add fresh ones based on simulation.
    const COMPUTE_BUDGET_PROGRAM_ID = ComputeBudgetProgram.programId.toString()

    const instructionsWithoutComputeBudget = solanaTransactionMetadata.instructions.filter(
      ix => ix.programId.toString() !== COMPUTE_BUDGET_PROGRAM_ID,
    )

    const { fast } = await adapter.getFeeData({
      to: '',
      value: '0',
      chainSpecific: {
        from,
        addressLookupTableAccounts: solanaTransactionMetadata.addressLookupTableAddresses,
        instructions: instructionsWithoutComputeBudget,
      },
    })

    const solanaInstructions = instructionsWithoutComputeBudget.map(instruction =>
      adapter.convertInstruction(instruction),
    )

    return adapter.buildSendApiTransaction({
      from,
      to: '',
      value: '0',
      accountNumber,
      chainSpecific: {
        addressLookupTableAccounts: solanaTransactionMetadata.addressLookupTableAddresses,
        instructions: solanaInstructions,
        computeUnitLimit: bnOrZero(fast.chainSpecific.computeUnits)
          .times(COMPUTE_UNIT_MARGIN_MULTIPLIER)
          .toFixed(0),
        computeUnitPrice: fast.chainSpecific.priorityFee,
      },
    })
  },
}

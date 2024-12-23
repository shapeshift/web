import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { TransactionInstruction } from '@solana/web3.js'

import type { GetUnsignedSolanaTransactionArgs, SwapperApi } from '../../types'
import { isSolanaFeeData } from '../../types'
import { checkSolanaSwapStatus, isExecutableTradeQuote, isExecutableTradeStep } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const jupiterApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  getUnsignedSolanaTransaction: async ({
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const step = tradeQuote.steps[0]

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')

    const solanaInstructions = step.jupiterTransactionMetadata?.instructions?.map(instruction =>
      adapter.convertInstruction(instruction),
    )

    if (!isSolanaFeeData(step.feeData.chainSpecific)) throw Error('Unable to execute step')

    const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      from,
      value: '0',
      accountNumber: step.accountNumber,
      chainSpecific: {
        addressLookupTableAccounts: step.jupiterTransactionMetadata?.addressLookupTableAddresses,
        instructions: solanaInstructions,
        computeUnitLimit: step.feeData.chainSpecific?.computeUnits,
        computeUnitPrice: step.feeData.chainSpecific?.priorityFee,
      },
    }

    return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
  },
  getSolanaTransactionFees: async ({
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }: GetUnsignedSolanaTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const step = tradeQuote.steps[0]

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')

    const solanaInstructions = step.jupiterTransactionMetadata?.instructions?.map(instruction =>
      adapter.convertInstruction(instruction),
    ) as TransactionInstruction[] | undefined

    if (!isSolanaFeeData(step.feeData.chainSpecific)) throw Error('Unable to execute step')

    const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      value: '0',
      chainSpecific: {
        from,
        addressLookupTableAccounts: step.jupiterTransactionMetadata?.addressLookupTableAddresses,
        instructions: solanaInstructions,
      },
    }

    const feeData = await adapter.getFeeData(getFeeDataInput)

    return feeData.fast.txFee
  },

  checkTradeStatus: checkSolanaSwapStatus,
}

import type { BuildSendApiTxInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'

import type { GetUnsignedSolanaTransactionArgs, SwapperApi } from '../../types'
import { isSolanaFeeData } from '../../types'
import { checkSolanaSwapStatus, isExecutableTradeQuote, isExecutableTradeStep } from '../../utils'
import { getTradeQuote, getTradeRate } from './swapperApi/getTradeQuote'

export const jupiterApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
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

  checkTradeStatus: checkSolanaSwapStatus,
}

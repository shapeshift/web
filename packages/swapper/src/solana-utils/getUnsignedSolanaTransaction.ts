import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'

import { COMPUTE_UNIT_MARGIN_MULTIPLIER } from '../swappers/JupiterSwapper'
import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { isExecutableTradeQuote, isExecutableTradeStep } from '../utils'

export const getUnsignedSolanaTransaction = async ({
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

  const firstStep = tradeQuote.steps[0]

  const adapter = assertGetSolanaChainAdapter(firstStep.sellAsset.chainId)

  if (!isExecutableTradeStep(firstStep)) throw Error('Unable to execute step')

  const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: firstStep.solanaTransactionMetadata?.addressLookupTableAddresses,
      instructions: firstStep.solanaTransactionMetadata?.instructions,
    },
  }

  const feeData = await adapter.getFeeData(getFeeDataInput)

  const solanaInstructions = firstStep.solanaTransactionMetadata?.instructions?.map(instruction =>
    adapter.convertInstruction(instruction),
  )

  const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
    to: '',
    from,
    value: '0',
    accountNumber: firstStep.accountNumber,
    chainSpecific: {
      addressLookupTableAccounts: firstStep.solanaTransactionMetadata?.addressLookupTableAddresses,
      instructions: solanaInstructions,
      // As always, as relay uses jupiter under the hood, we need to add the compute unit safety margin
      computeUnitLimit: bnOrZero(feeData.fast.chainSpecific.computeUnits)
        .times(COMPUTE_UNIT_MARGIN_MULTIPLIER)
        .toFixed(0),
      computeUnitPrice: feeData.fast.chainSpecific.priorityFee,
    },
  }

  return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
}

import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero } from '@shapeshiftoss/utils'

import { COMPUTE_UNIT_MARGIN_MULTIPLIER } from '../swappers/JupiterSwapper'
import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../utils'

export const getUnsignedSolanaTransaction = async ({
  stepIndex,
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { accountNumber, solanaTransactionMetadata, sellAsset } = step

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: solanaTransactionMetadata?.addressLookupTableAddresses,
      instructions: solanaTransactionMetadata?.instructions,
    },
  })

  const solanaInstructions = solanaTransactionMetadata?.instructions?.map(instruction =>
    adapter.convertInstruction(instruction),
  )

  return adapter.buildSendApiTransaction({
    from,
    to: '',
    value: '0',
    accountNumber,
    chainSpecific: {
      addressLookupTableAccounts: solanaTransactionMetadata?.addressLookupTableAddresses,
      instructions: solanaInstructions,
      // As always, as relay uses jupiter under the hood, we need to add the compute unit safety margin
      computeUnitLimit: bnOrZero(fast.chainSpecific.computeUnits)
        .times(COMPUTE_UNIT_MARGIN_MULTIPLIER)
        .toFixed(0),
      computeUnitPrice: fast.chainSpecific.priorityFee,
    },
  })
}

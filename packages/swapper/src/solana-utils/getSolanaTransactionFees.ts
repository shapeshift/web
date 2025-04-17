import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'

import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { isExecutableTradeQuote, isExecutableTradeStep } from '../utils'

export const getSolanaTransactionFees = async ({
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs): Promise<string> => {
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

  return feeData.fast.txFee
}

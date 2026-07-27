import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { omitComputeBudgetInstructions } from './computeBudgetInstructions'
import { getSolanaNetworkFeeCryptoBaseUnit } from './getSolanaNetworkFeeCryptoBaseUnit'

export const getSolanaExecutionContext = async ({
  stepIndex,
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (transactionData?.type !== 'solana') throw new Error('invalid solana transaction')

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  // Strip any budget instructions that made it into the transaction data so the freshly derived
  // compute budget is never duplicated (solana rejects duplicates)
  const instructions = omitComputeBudgetInstructions(transactionData.instructions)

  const { feeData, includeComputeBudget } = await getSolanaNetworkFeeCryptoBaseUnit({
    adapter,
    from,
    instructions,
    addressLookupTableAddresses: transactionData.addressLookupTableAddresses,
    tokenId: contractAddressOrUndefined(sellAsset.assetId),
  })

  return { step, adapter, feeData, transactionData, instructions, includeComputeBudget }
}

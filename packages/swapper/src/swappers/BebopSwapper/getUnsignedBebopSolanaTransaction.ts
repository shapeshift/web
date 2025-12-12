import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { ComputeBudgetProgram, type TransactionInstruction } from '@solana/web3.js'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getUnsignedBebopSolanaTransaction = async ({
  stepIndex,
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { accountNumber, solanaTransactionMetadata, sellAsset } = step

  if (!solanaTransactionMetadata) {
    throw new Error('Missing solanaTransactionMetadata')
  }

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  let computeUnitLimit: number | undefined
  let computeUnitPrice: number | undefined
  const nonComputeBudgetInstructions: TransactionInstruction[] = []

  solanaTransactionMetadata.instructions?.forEach(ix => {
    if (ix.programId.equals(ComputeBudgetProgram.programId)) {
      const data = ix.data
      if (data[0] === 2) {
        computeUnitLimit = data.readUInt32LE(1)
      } else if (data[0] === 3) {
        computeUnitPrice = Number(data.readBigUInt64LE(1))
      }
    } else {
      nonComputeBudgetInstructions.push(ix)
    }
  })

  const solanaInstructions = nonComputeBudgetInstructions.map(instruction =>
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
      computeUnitLimit: computeUnitLimit?.toString(),
      computeUnitPrice: computeUnitPrice?.toString(),
    },
  })
}

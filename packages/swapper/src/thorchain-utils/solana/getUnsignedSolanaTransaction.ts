import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'

import type { GetUnsignedSolanaTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

// Each ComputeBudgetProgram instruction (setComputeUnitLimit, setComputeUnitPrice) costs 150 CU.
// Fee estimation doesn't include these, so we add a fixed buffer to cover them.
const COMPUTE_BUDGET_INSTRUCTION_OVERHEAD_CU = 300

export const getUnsignedSolanaTransaction = async (
  args: GetUnsignedSolanaTransactionArgs,
  swapperName: SwapperName,
): Promise<SolanaSignTx> => {
  const { tradeQuote, stepIndex, from, assertGetSolanaChainAdapter, config } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

  const { vault } = await getThorTxData({
    sellAsset,
    config,
    swapperName,
  })

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(memo, 'utf8'),
  })

  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(from),
    toPubkey: new PublicKey(vault),
    lamports: BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit),
  })

  const { fast } = await adapter.getFeeData({
    to: vault,
    value: '0',
    chainSpecific: {
      from,
      instructions: [memoInstruction, transferInstruction],
    },
  })

  const memoHdwalletInstruction = {
    keys: [] as [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf8'),
  }

  return adapter.buildSendApiTransaction({
    from,
    to: vault,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber,
    chainSpecific: {
      instructions: [memoHdwalletInstruction],
      computeUnitLimit: String(
        Number(fast.chainSpecific.computeUnits) + COMPUTE_BUDGET_INSTRUCTION_OVERHEAD_CU,
      ),
      computeUnitPrice: fast.chainSpecific.priorityFee,
      tokenId: contractAddressOrUndefined(sellAsset.assetId),
    },
  })
}

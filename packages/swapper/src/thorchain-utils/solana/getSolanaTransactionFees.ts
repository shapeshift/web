import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'

import type { GetUnsignedSolanaTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

export const getSolanaTransactionFees = async (
  args: GetUnsignedSolanaTransactionArgs,
  swapperName: SwapperName,
): Promise<string> => {
  const { tradeQuote, stepIndex, from, assertGetSolanaChainAdapter, config } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

  const { vault } = await getThorTxData({ sellAsset, config, swapperName })

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(memo, 'utf8'),
  })

  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(from),
    toPubkey: new PublicKey(vault),
    lamports: Number(sellAmountIncludingProtocolFeesCryptoBaseUnit),
  })

  const { fast } = await adapter.getFeeData({
    to: vault,
    value: '0',
    chainSpecific: {
      from,
      tokenId: contractAddressOrUndefined(sellAsset.assetId),
      instructions: [memoInstruction, transferInstruction],
    },
  })

  return fast.txFee
}

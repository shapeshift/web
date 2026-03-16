import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey, SystemProgram } from '@solana/web3.js'

import type { JitoService } from './jitoService'

// Default tip: 10,000 lamports (~$0.002 at current SOL prices)
// This is well above the 1,000 lamport minimum and competitive for most use cases.
const DEFAULT_TIP_LAMPORTS = 10_000

/**
 * Build a Jito tip instruction (SystemProgram.transfer to a random tip account).
 * Tip accounts are dynamic - fetched from getTipAccounts, one picked at random.
 *
 * This instruction should be included in the LAST transaction of a Jito bundle,
 * so the tip is only paid if all prior transactions succeed.
 */
export const buildJitoTipInstruction = async ({
  jitoService,
  fromPubkey,
  tipLamports = DEFAULT_TIP_LAMPORTS,
}: {
  jitoService: JitoService
  fromPubkey: PublicKey
  tipLamports?: number
}): Promise<TransactionInstruction> => {
  const tipAccounts = await jitoService.getTipAccounts()

  if (!tipAccounts.length) {
    throw new Error('Jito returned no tip accounts')
  }

  // Pick a random tip account to reduce contention across users
  const randomIndex = Math.floor(Math.random() * tipAccounts.length)
  const tipAccount = new PublicKey(tipAccounts[randomIndex])

  return SystemProgram.transfer({
    fromPubkey,
    toPubkey: tipAccount,
    lamports: tipLamports,
  })
}

import * as core from '@shapeshiftoss/hdwallet-core'
import type { PublicKey } from '@solana/web3.js'
import { VersionedTransaction } from '@solana/web3.js'

import type { VultisigSolanaProvider } from './types'

export type SolanaAccount = {
  publicKey: PublicKey
}

export async function solanaSignTx(
  msg: core.SolanaSignTx,
  provider: VultisigSolanaProvider,
  address: string,
): Promise<core.SolanaSignedTx | null> {
  const transaction = core.solanaBuildTransaction(msg, address)
  const signedTransaction = await provider.signTransaction(transaction)
  return {
    serialized: Buffer.from(signedTransaction.serialize()).toString('base64'),
    signatures: signedTransaction.signatures.map(signature =>
      Buffer.from(signature).toString('base64'),
    ),
  }
}

export async function solanaSignSerializedTx(
  msg: core.SolanaSignSerializedTx,
  provider: VultisigSolanaProvider,
): Promise<core.SolanaSignedTx | null> {
  const txBytes = Buffer.from(msg.serializedTx, 'base64')
  const transaction = VersionedTransaction.deserialize(txBytes)
  const signedTransaction = await provider.signTransaction(transaction)

  // Extract signatures before serialize - for partially-signed txs (e.g. gasless Bebop),
  // serialize() throws because not all required signatures are present yet.
  const signatures = signedTransaction.signatures.map(signature =>
    Buffer.from(signature).toString('base64'),
  )

  let serialized: string
  try {
    serialized = Buffer.from(signedTransaction.serialize()).toString('base64')
  } catch {
    serialized = msg.serializedTx
  }

  return { serialized, signatures }
}

export async function solanaSendTx(
  msg: core.SolanaSignTx,
  provider: VultisigSolanaProvider,
  address: string,
): Promise<core.SolanaTxSignature | null> {
  const transaction = core.solanaBuildTransaction(msg, address)
  const { signature } = await provider.signAndSendTransaction(transaction)
  return { signature }
}

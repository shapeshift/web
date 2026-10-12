import type { PublicKey, TransactionSignature, VersionedTransaction } from '@solana/web3.js'
import type { providers } from 'ethers'

import type { SolanaAccount } from './solana'

export type PhantomEvmProvider = providers.ExternalProvider & {
  _metamask: {
    isUnlocked: () => boolean
  }
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

export type PhantomSolanaProvider = providers.ExternalProvider & {
  publicKey?: PublicKey
  connect(): Promise<SolanaAccount>
  signTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction>
  signAndSendTransaction(
    transaction: VersionedTransaction,
  ): Promise<{ signature: TransactionSignature }>
}

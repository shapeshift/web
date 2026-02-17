import type {
  PathDescription,
  SolanaAccountPath,
  SolanaGetAccountPaths,
  SolanaGetAddress,
  SolanaSignedTx,
  SolanaSignTx,
  SolanaTxSignature,
} from '@shapeshiftoss/hdwallet-core'
import {
  solanaBuildTransaction,
  solanaDescribePath,
  solanaGetAccountPaths,
} from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'

export function describeSolanaPath(path: number[]): PathDescription {
  return solanaDescribePath(path)
}

export function solanaWcGetAccountPaths(msg: SolanaGetAccountPaths): SolanaAccountPath[] {
  return solanaGetAccountPaths(msg)
}

export function solanaNextAccountPath(_msg: SolanaAccountPath): SolanaAccountPath | undefined {
  return undefined
}

export async function solanaGetAddress(
  provider: EthereumProvider,
  _msg: SolanaGetAddress,
): Promise<string | null> {
  try {
    const session = provider.session
    if (!session) return null

    const solanaAccounts = session.namespaces?.solana?.accounts
    if (!solanaAccounts || solanaAccounts.length === 0) return null

    // CAIP-10 format: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:<base58-pubkey>
    const parts = solanaAccounts[0].split(':')
    return parts[2] ?? null
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function solanaSignTx(
  provider: EthereumProvider,
  msg: SolanaSignTx,
  address: string,
): Promise<SolanaSignedTx | null> {
  try {
    const transaction = solanaBuildTransaction(msg, address)
    const serializedTx = Buffer.from(transaction.serialize()).toString('base64')

    const result = await provider.signer.request<{ transaction: string }>(
      {
        method: 'solana_signTransaction',
        params: { transaction: serializedTx },
      },
      SOLANA_MAINNET_CAIP2,
    )

    if (!result?.transaction) return null

    // The WC wallet returns the fully signed transaction as base64
    // We need to deserialize it to extract signatures
    const { VersionedTransaction } = await import('@solana/web3.js')
    const signedTx = VersionedTransaction.deserialize(Buffer.from(result.transaction, 'base64'))

    return {
      serialized: result.transaction,
      signatures: signedTx.signatures.map(sig => Buffer.from(sig).toString('base64')),
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function solanaSendTx(
  provider: EthereumProvider,
  msg: SolanaSignTx,
  address: string,
): Promise<SolanaTxSignature | null> {
  try {
    const transaction = solanaBuildTransaction(msg, address)
    const serializedTx = Buffer.from(transaction.serialize()).toString('base64')

    const result = await provider.signer.request<{ signature: string }>(
      {
        method: 'solana_signAndSendTransaction',
        params: { transaction: serializedTx },
      },
      SOLANA_MAINNET_CAIP2,
    )

    if (!result?.signature) return null

    return { signature: result.signature }
  } catch (error) {
    console.error(error)
    return null
  }
}

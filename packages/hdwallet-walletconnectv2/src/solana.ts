import type {
  SolanaGetAddress,
  SolanaSignedTx,
  SolanaSignTx,
  SolanaTxSignature,
} from '@shapeshiftoss/hdwallet-core'
import { solanaBuildTransaction } from '@shapeshiftoss/hdwallet-core'
import { VersionedTransaction } from '@solana/web3.js'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'

function buildSerializedTransaction(msg: SolanaSignTx, address: string): string {
  const transaction = solanaBuildTransaction(msg, address)
  return Buffer.from(transaction.serialize()).toString('base64')
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
    const serializedTx = buildSerializedTransaction(msg, address)

    const result = await provider.signer.request<{ transaction: string }>(
      {
        method: 'solana_signTransaction',
        params: { transaction: serializedTx },
      },
      SOLANA_MAINNET_CAIP2,
    )

    if (!result?.transaction) return null

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
    const serializedTx = buildSerializedTransaction(msg, address)

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

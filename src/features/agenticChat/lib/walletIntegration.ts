import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'

import type { Transaction } from '../types/toolOutput'

import {
  assertGetEvmChainAdapter,
  createBuildCustomTxInput,
  signAndBroadcast,
} from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'

type ExecuteEvmTransactionParams = {
  tx: Transaction
  wallet: HDWallet
  accountId: AccountId
  accountMetadata: AccountMetadata
}

export async function executeEvmTransaction(params: ExecuteEvmTransactionParams): Promise<string> {
  const { tx, wallet, accountId, accountMetadata } = params

  if (!tx.to || typeof tx.to !== 'string') {
    throw new Error('Invalid EVM transaction: missing or invalid "to" address')
  }
  if (!tx.chainId || typeof tx.chainId !== 'string') {
    throw new Error('Invalid EVM transaction: missing or invalid "chainId"')
  }
  if (tx.value === undefined || tx.value === null || typeof tx.value !== 'string') {
    throw new Error('Invalid EVM transaction: missing or invalid "value"')
  }

  const adapter = assertGetEvmChainAdapter(tx.chainId)

  const { accountNumber } = accountMetadata.bip44Params
  const { accountType } = accountMetadata

  const senderAddress = await adapter.getAddress({
    accountNumber,
    accountType,
    wallet,
    pubKey: fromAccountId(accountId).account,
  })

  const buildCustomTxInput = await createBuildCustomTxInput({
    accountNumber,
    adapter,
    from: tx.from,
    to: tx.to,
    data: tx.data,
    value: tx.value,
    wallet,
    pubKey: fromAccountId(accountId).account,
  })

  const { txToSign } = await adapter.buildCustomTx(buildCustomTxInput)

  const txHash = await signAndBroadcast({
    adapter,
    txToSign,
    wallet,
    senderAddress,
    receiverAddress: tx.to,
  })

  return txHash
}

type ExecuteSolanaTransactionParams = {
  tx: Transaction
  wallet: HDWallet
  accountId: AccountId
  accountMetadata: AccountMetadata
}

export async function executeSolanaTransaction(
  params: ExecuteSolanaTransactionParams,
): Promise<string> {
  const { tx, wallet, accountId, accountMetadata } = params

  if (!tx.data || typeof tx.data !== 'string') {
    throw new Error('Invalid Solana transaction: missing or invalid "data"')
  }
  if (!tx.chainId || typeof tx.chainId !== 'string') {
    throw new Error('Invalid Solana transaction: missing or invalid "chainId"')
  }

  const adapter = assertGetSolanaChainAdapter(tx.chainId)

  const { accountNumber } = accountMetadata.bip44Params

  const senderAddress = await adapter.getAddress({
    accountNumber,
    wallet,
    pubKey: fromAccountId(accountId).account,
  })

  let txData: {
    instructions?: {
      programId: string
      keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[]
      data: string
    }[]
    computeUnitLimit?: number
    computeUnitPrice?: number
    addressLookupTableAccounts?: string[]
  }
  try {
    txData = JSON.parse(tx.data)
  } catch {
    throw new Error('Invalid Solana transaction data: expected valid JSON')
  }
  const rawInstructions = txData.instructions ?? []

  // Convert hex data strings back to Buffers for Solana SDK
  const instructions = rawInstructions.map(ix => ({
    programId: ix.programId,
    keys: ix.keys,
    data: Buffer.from(ix.data, 'hex'),
  }))

  const { txToSign } = await adapter.buildCustomTx({
    wallet,
    accountNumber,
    pubKey: fromAccountId(accountId).account,
    instructions,
    computeUnitLimit: txData.computeUnitLimit,
    computeUnitPrice: txData.computeUnitPrice,
    addressLookupTableAccounts: txData.addressLookupTableAccounts,
  })

  if (wallet.supportsOfflineSigning()) {
    const signedTx = await adapter.signTransaction({ txToSign, wallet })
    return adapter.broadcastTransaction({
      senderAddress,
      receiverAddress: tx.to,
      hex: signedTx,
    })
  } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    return adapter.signAndBroadcastTransaction({
      senderAddress,
      receiverAddress: tx.to,
      signTxInput: { txToSign, wallet },
    })
  }

  throw new Error('Wallet does not support Solana signing')
}

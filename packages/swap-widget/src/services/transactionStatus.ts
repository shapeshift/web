import type { Connection, SignatureStatus } from '@solana/web3.js'
import type { PublicClient } from 'viem'
import { createPublicClient, http } from 'viem'
import { arbitrum, avalanche, base, bsc, gnosis, mainnet, optimism, polygon } from 'viem/chains'

export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export type TransactionStatusResult = {
  status: TransactionStatus
  confirmations?: number
  blockNumber?: number
  error?: string
}

export type BitcoinTransactionStatus = {
  confirmed: boolean
  block_height?: number
  block_hash?: string
  block_time?: number
}

type EvmChain =
  | typeof mainnet
  | typeof optimism
  | typeof bsc
  | typeof gnosis
  | typeof polygon
  | typeof base
  | typeof arbitrum
  | typeof avalanche

const EVM_CHAINS_BY_ID: Record<number, EvmChain> = {
  1: mainnet,
  10: optimism,
  56: bsc,
  100: gnosis,
  137: polygon,
  8453: base,
  42161: arbitrum,
  43114: avalanche,
}

const MEMPOOL_API_BASE = 'https://mempool.space/api'

export const checkEvmStatus = async (
  txHash: string,
  chainId: number,
  existingClient?: PublicClient,
): Promise<TransactionStatusResult> => {
  try {
    const chain = EVM_CHAINS_BY_ID[chainId]
    const client =
      existingClient ??
      createPublicClient({
        chain: chain ?? mainnet,
        transport: http(),
      })

    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    })

    if (!receipt) {
      return { status: 'pending' }
    }

    const currentBlock = await client.getBlockNumber()
    const confirmations = Number(currentBlock - receipt.blockNumber) + 1

    if (receipt.status === 'success') {
      return {
        status: 'confirmed',
        confirmations,
        blockNumber: Number(receipt.blockNumber),
      }
    }

    return {
      status: 'failed',
      blockNumber: Number(receipt.blockNumber),
      error: 'Transaction reverted',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (
      errorMessage.includes('could not be found') ||
      errorMessage.includes('Transaction not found')
    ) {
      return { status: 'pending' }
    }

    return {
      status: 'pending',
      error: errorMessage,
    }
  }
}

export const checkBitcoinStatus = async (
  txid: string,
  network: 'mainnet' | 'testnet' = 'mainnet',
): Promise<TransactionStatusResult> => {
  try {
    const baseUrl = network === 'testnet' ? 'https://mempool.space/testnet/api' : MEMPOOL_API_BASE

    const response = await fetch(`${baseUrl}/tx/${txid}/status`)

    if (!response.ok) {
      if (response.status === 404) {
        return { status: 'pending' }
      }
      throw new Error(`HTTP error: ${response.status}`)
    }

    const data: BitcoinTransactionStatus = await response.json()

    if (data.confirmed) {
      const currentBlockResponse = await fetch(`${baseUrl}/blocks/tip/height`)
      const currentBlockHeight = await currentBlockResponse.json()

      const confirmations = data.block_height
        ? Number(currentBlockHeight) - data.block_height + 1
        : 1

      return {
        status: 'confirmed',
        confirmations,
        blockNumber: data.block_height,
      }
    }

    return { status: 'pending' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      status: 'pending',
      error: errorMessage,
    }
  }
}

export const checkSolanaStatus = async (
  signature: string,
  connection: Connection,
): Promise<TransactionStatusResult> => {
  try {
    const statusResult = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    })

    const status: SignatureStatus | null = statusResult?.value

    if (!status) {
      return { status: 'pending' }
    }

    if (status.err) {
      return {
        status: 'failed',
        error: typeof status.err === 'string' ? status.err : JSON.stringify(status.err),
      }
    }

    if (status.confirmationStatus === 'finalized' || status.confirmationStatus === 'confirmed') {
      return {
        status: 'confirmed',
        confirmations: status.confirmations ?? undefined,
        blockNumber: status.slot,
      }
    }

    if (status.confirmationStatus === 'processed') {
      return {
        status: 'pending',
        confirmations: status.confirmations ?? undefined,
        blockNumber: status.slot,
      }
    }

    return { status: 'pending' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      status: 'pending',
      error: errorMessage,
    }
  }
}

export const waitForEvmConfirmation = async (
  txHash: string,
  chainId: number,
  confirmations = 1,
  timeoutMs = 120000,
): Promise<TransactionStatusResult> => {
  const chain = EVM_CHAINS_BY_ID[chainId]
  const client = createPublicClient({
    chain: chain ?? mainnet,
    transport: http(),
  })

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    confirmations,
    timeout: timeoutMs,
  })

  if (receipt.status === 'success') {
    return {
      status: 'confirmed',
      confirmations,
      blockNumber: Number(receipt.blockNumber),
    }
  }

  return {
    status: 'failed',
    blockNumber: Number(receipt.blockNumber),
    error: 'Transaction reverted',
  }
}

export const waitForBitcoinConfirmation = async (
  txid: string,
  requiredConfirmations = 1,
  pollIntervalMs = 30000,
  timeoutMs = 600000,
  network: 'mainnet' | 'testnet' = 'mainnet',
): Promise<TransactionStatusResult> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const result = await checkBitcoinStatus(txid, network)

    if (result.status === 'confirmed' && (result.confirmations ?? 0) >= requiredConfirmations) {
      return result
    }

    if (result.status === 'failed') {
      return result
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  return {
    status: 'pending',
    error: 'Timeout waiting for confirmation',
  }
}

export const waitForSolanaConfirmation = async (
  signature: string,
  connection: Connection,
  commitment: 'confirmed' | 'finalized' = 'confirmed',
  _timeoutMs = 60000,
): Promise<TransactionStatusResult> => {
  try {
    const latestBlockhash = await connection.getLatestBlockhash()

    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      commitment,
    )

    return await checkSolanaStatus(signature, connection)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('block height exceeded')) {
      return {
        status: 'failed',
        error: 'Transaction expired',
      }
    }

    return {
      status: 'failed',
      error: errorMessage,
    }
  }
}

export type ChainType = 'evm' | 'utxo' | 'solana'

export type CheckStatusParams = {
  txHash: string
  chainType: ChainType
  chainId?: number
  connection?: Connection
  network?: 'mainnet' | 'testnet'
}

export const checkTransactionStatus = async (
  params: CheckStatusParams,
): Promise<TransactionStatusResult> => {
  const { txHash, chainType, chainId, connection, network = 'mainnet' } = params

  switch (chainType) {
    case 'evm':
      if (!chainId) {
        throw new Error('chainId is required for EVM transactions')
      }
      return await checkEvmStatus(txHash, chainId)

    case 'utxo':
      return await checkBitcoinStatus(txHash, network)

    case 'solana':
      if (!connection) {
        throw new Error('connection is required for Solana transactions')
      }
      return await checkSolanaStatus(txHash, connection)

    default:
      throw new Error(`Unsupported chain type: ${chainType}`)
  }
}

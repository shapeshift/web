import type { TransactionDto } from './types'

export type ParsedUnsignedTransaction = {
  to: string
  from: string
  data: string
  value?: string
  gasLimit?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce: number
  chainId: number
}

/**
 * Parse the JSON string unsignedTransaction from Yield.xyz API
 */
export const parseUnsignedTransaction = (tx: TransactionDto): ParsedUnsignedTransaction => {
  if (typeof tx.unsignedTransaction === 'string') {
    return JSON.parse(tx.unsignedTransaction)
  }
  return tx.unsignedTransaction as unknown as ParsedUnsignedTransaction
}

/**
 * Convert parsed tx to format expected by chain adapter signTransaction
 * Note: This is a simplified version. In a real implementation, we need to handle
 * different chain types (EVM, Cosmos, Solana, etc.) differently.
 * For this POC, we assume EVM.
 */
export const toChainAdapterTx = (parsed: ParsedUnsignedTransaction) => {
  return {
    to: parsed.to,
    from: parsed.from,
    data: parsed.data,
    value: parsed.value ?? '0x0',
    gasLimit: parsed.gasLimit,
    maxFeePerGas: parsed.maxFeePerGas,
    maxPriorityFeePerGas: parsed.maxPriorityFeePerGas,
    nonce: String(parsed.nonce),
    chainId: parsed.chainId,
  }
}

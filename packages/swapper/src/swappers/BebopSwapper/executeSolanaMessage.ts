import baseX from 'base-x'

import type { SolanaMessageExecutionProps, SolanaMessageToSign } from '../../types'
import { bebopServiceFactory } from './utils/bebopService'

// Base58 alphabet used by Bitcoin and Solana
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const base58 = baseX(BASE58_ALPHABET)

export const executeSolanaMessage = async (
  messageData: SolanaMessageToSign,
  callbacks: SolanaMessageExecutionProps,
  apiKey: string,
): Promise<string> => {
  const { messageToSign, quoteId } = messageData

  if (!quoteId) {
    throw new Error('Quote ID is required for Solana order submission')
  }

  // Sign the message bytes
  const signature = await callbacks.signMessage(messageToSign)

  // Convert signature to base58 for Bebop API
  const base58Signature = base58.encode(Buffer.from(signature))

  console.log('[Bebop executeSolanaMessage] Submitting order:', {
    quoteId,
    signatureLength: signature.length,
  })

  // Submit to Bebop /v3/order endpoint
  const bebopService = bebopServiceFactory({ apiKey })
  const response = await bebopService.post<{ txHash: string }>(
    'https://api.bebop.xyz/pmm/solana/v3/order',
    {
      quote_id: quoteId,
      signature: base58Signature,
    },
  )

  if (response.isErr()) {
    throw response.unwrapErr()
  }

  const { txHash } = response.unwrap().data

  if (!txHash) {
    throw new Error('No transaction hash returned from Bebop order submission')
  }

  console.log('[Bebop executeSolanaMessage] Order submitted successfully:', txHash)

  return txHash
}
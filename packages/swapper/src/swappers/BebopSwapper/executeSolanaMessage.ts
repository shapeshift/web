import bs58 from 'bs58'

import type { SolanaMessageExecutionProps, SolanaMessageToSign, SwapperConfig } from '../../types'
import { bebopServiceFactory } from './utils/bebopService'

type BebopOrderResponse = {
  txHash?: string
  status?: string
  error?: {
    errorCode: number
    message: string
    requestId: string
  }
}

export const executeSolanaMessage = async (
  messageData: SolanaMessageToSign,
  { signSerializedTransaction }: SolanaMessageExecutionProps,
  config: SwapperConfig,
): Promise<string> => {
  const { serializedTx, quoteId } = messageData

  if (!serializedTx || !quoteId) {
    throw new Error('Missing serializedTx or quoteId in message data')
  }

  const signatures = await signSerializedTransaction(serializedTx)

  if (!signatures.length) {
    throw new Error('No signatures returned from wallet')
  }

  // Find the actual non-zero user signature (skip empty placeholder slots from co-signers)
  const nonZeroSigIndex = signatures.findIndex(sig => {
    const bytes = Buffer.from(sig, 'base64')
    return !bytes.every(b => b === 0)
  })

  if (nonZeroSigIndex === -1) {
    throw new Error('No non-zero signatures found after signing')
  }

  const userSignatureBase64 = signatures[nonZeroSigIndex]
  const userSignatureBytes = Buffer.from(userSignatureBase64, 'base64')
  const userSignatureBase58 = bs58.encode(userSignatureBytes)

  const bebopService = bebopServiceFactory({ apiKey: config.VITE_BEBOP_API_KEY })
  const maybeOrderResponse = await bebopService.post<BebopOrderResponse>(
    'https://api.bebop.xyz/pmm/solana/v3/order',
    {
      quote_id: quoteId,
      signature: userSignatureBase58,
    },
  )

  if (maybeOrderResponse.isErr()) {
    const error = maybeOrderResponse.unwrapErr()
    throw new Error(`Bebop order submission failed: ${error.cause ?? error.message}`)
  }

  const { data: orderResponse } = maybeOrderResponse.unwrap()

  if (orderResponse.error) {
    throw new Error(
      `Bebop order failed: ${orderResponse.error.message} (code ${orderResponse.error.errorCode})`,
    )
  }

  if (!orderResponse.txHash) {
    throw new Error(`Bebop order response missing txHash: ${JSON.stringify(orderResponse)}`)
  }

  return orderResponse.txHash
}

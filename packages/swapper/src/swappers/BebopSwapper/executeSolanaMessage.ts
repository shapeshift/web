import { Connection, VersionedTransaction } from '@solana/web3.js'
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

  console.log(`[Bebop Solana Exec] Starting execution: ${JSON.stringify({
    quoteId,
    hasSerializedTx: !!serializedTx,
    serializedTxLength: serializedTx?.length,
  })}`)

  if (!serializedTx || !quoteId) {
    throw new Error('Missing serializedTx or quoteId in message data')
  }

  // Decode and inspect the pre-built tx before signing
  try {
    const preTxBytes = Buffer.from(serializedTx, 'base64')
    const preTx = VersionedTransaction.deserialize(preTxBytes)
    const msg = preTx.message
    const numRequiredSigs = msg.header.numRequiredSignatures
    const numReadonlySigned = msg.header.numReadonlySignedAccounts
    const numReadonlyUnsigned = msg.header.numReadonlyUnsignedAccounts
    const accountKeys = msg.staticAccountKeys.map(k => k.toBase58())
    const recentBlockhash = msg.recentBlockhash

    console.log(`[Bebop Solana Exec] TX INSPECTION: ${JSON.stringify({
      numRequiredSignatures: numRequiredSigs,
      numReadonlySigned,
      numReadonlyUnsigned,
      totalAccountKeys: accountKeys.length,
      accountKeys,
      recentBlockhash,
      numInstructions: msg.compiledInstructions.length,
      feePayer: accountKeys[0],
    })}`)

    // Log each instruction
    msg.compiledInstructions.forEach((ix, i) => {
      const programId = accountKeys[ix.programIdIndex]
      const ixAccounts = ix.accountKeyIndexes.map(idx => ({
        index: idx,
        pubkey: accountKeys[idx],
        isSigner: idx < numRequiredSigs,
        isWritable: idx < numRequiredSigs - numReadonlySigned || (idx >= numRequiredSigs && idx < accountKeys.length - numReadonlyUnsigned),
      }))
      console.log(`[Bebop Solana Exec] Instruction[${i}]: program=${programId}, data=${Buffer.from(ix.data).toString('hex').slice(0, 40)}..., accounts=${JSON.stringify(ixAccounts)}`)
    })

    // Check address lookup tables
    if (msg.addressTableLookups && msg.addressTableLookups.length > 0) {
      console.log(`[Bebop Solana Exec] Address table lookups: ${JSON.stringify(msg.addressTableLookups.map(l => ({
        table: l.accountKey.toBase58(),
        writableIndexes: Array.from(l.writableIndexes),
        readonlyIndexes: Array.from(l.readonlyIndexes),
      })))}`)
    }
  } catch (e) {
    console.error(`[Bebop Solana Exec] Failed to inspect pre-sign tx: ${(e as Error).message}`)
  }

  console.log(`[Bebop Solana Exec] Calling wallet.solanaSignSerializedTx...`)
  const signatures = await signSerializedTransaction(serializedTx)

  console.log(`[Bebop Solana Exec] Wallet returned ${signatures.length} signatures`)
  signatures.forEach((sig, i) => {
    const bytes = Buffer.from(sig, 'base64')
    const isZero = bytes.every(b => b === 0)
    console.log(`[Bebop Solana Exec] Signature[${i}]: isZero=${isZero}, length=${bytes.length}, first4bytes=${bytes.slice(0, 4).toString('hex')}`)
  })

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

  console.log(`[Bebop Solana Exec] Using signature at index ${nonZeroSigIndex}, base58: ${userSignatureBase58.slice(0, 20)}...`)

  // Try to simulate the tx with just the user's signature to catch issues before Bebop broadcasts
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
    const simTxBytes = Buffer.from(serializedTx, 'base64')
    const simTx = VersionedTransaction.deserialize(simTxBytes)
    // Replace the user's signature slot
    const sigBytes = Buffer.from(userSignatureBase64, 'base64')
    simTx.signatures[nonZeroSigIndex] = sigBytes

    console.log(`[Bebop Solana Exec] Simulating tx (user-sig only)...`)
    const simResult = await connection.simulateTransaction(simTx, {
      sigVerify: false, // don't verify sigs since Bebop's are missing
      replaceRecentBlockhash: true, // use fresh blockhash for simulation
    })
    console.log(`[Bebop Solana Exec] Simulation result: ${JSON.stringify({
      err: simResult.value.err,
      logs: simResult.value.logs?.slice(-10), // last 10 log lines
      unitsConsumed: simResult.value.unitsConsumed,
    })}`)
  } catch (e) {
    console.error(`[Bebop Solana Exec] Simulation failed: ${(e as Error).message}`)
  }

  console.log(`[Bebop Solana Exec] Submitting order to Bebop: ${JSON.stringify({
    quote_id: quoteId,
    signatureBase58Preview: userSignatureBase58.slice(0, 20) + '...',
  })}`)

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
    console.error(`[Bebop Solana Exec] Order HTTP error: ${JSON.stringify({ message: error.message, cause: error.cause })}`)
    throw new Error(`Bebop order submission failed: ${error.cause ?? error.message}`)
  }

  const { data: orderResponse } = maybeOrderResponse.unwrap()

  console.log(`[Bebop Solana Exec] Order response: ${JSON.stringify(orderResponse)}`)

  if (orderResponse.error) {
    console.error(`[Bebop Solana Exec] Order failed: ${JSON.stringify(orderResponse.error)}`)
    throw new Error(
      `Bebop order failed: ${orderResponse.error.message} (code ${orderResponse.error.errorCode})`,
    )
  }

  if (!orderResponse.txHash) {
    throw new Error(`Bebop order response missing txHash: ${JSON.stringify(orderResponse)}`)
  }

  // Poll Bebop order status to check if they actually broadcast it
  console.log(`[Bebop Solana Exec] Success! txHash: ${orderResponse.txHash}`)
  console.log(`[Bebop Solana Exec] Full order response details: ${JSON.stringify(orderResponse)}`)

  // Also log the raw serialized tx for offline decoding if needed
  console.log(`[Bebop Solana Exec] Raw serializedTx (for debugging): ${serializedTx}`)

  return orderResponse.txHash
}

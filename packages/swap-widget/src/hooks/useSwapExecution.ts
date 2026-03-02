import { useEffect, useRef } from 'react'
import type { WalletClient } from 'viem'

import { switchOrAddChain, VIEM_CHAINS_BY_ID } from '../constants/viemChains'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { getEvmNetworkId } from '../types'

export const useSwapExecution = () => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const context = SwapMachineCtx.useSelector(s => s.context)
  const actorRef = SwapMachineCtx.useActorRef()

  const { walletClient, walletAddress, bitcoin, solana } = useSwapWallet()

  const executingRef = useRef(false)

  useEffect(() => {
    const snap = actorRef.getSnapshot()
    if (!snap.matches('executing') || executingRef.current) return
    executingRef.current = true

    const executeSwap = async () => {
      try {
        const quote = context.quote
        if (!quote) {
          actorRef.send({ type: 'EXECUTE_ERROR', error: 'No quote available' })
          return
        }

        if (context.isSellAssetEvm) {
          if (!walletClient || !walletAddress) {
            actorRef.send({ type: 'EXECUTE_ERROR', error: 'No wallet connected' })
            return
          }

          const requiredChainId = getEvmNetworkId(context.sellAsset.chainId)
          const client = walletClient as WalletClient

          const currentChainId = await client.getChainId()
          if (currentChainId !== requiredChainId) {
            await switchOrAddChain(client, requiredChainId)
          }

          const viemChain = VIEM_CHAINS_BY_ID[requiredChainId]
          if (!viemChain) {
            throw new Error(
              `Unsupported EVM chain ID ${requiredChainId}. No RPC configuration available.`,
            )
          }
          const chain = viemChain

          const outerStep = quote.steps?.[0]
          const innerStep = quote.quote?.steps?.[0]

          const transactionData =
            quote.transactionData ??
            outerStep?.transactionData ??
            outerStep?.relayTransactionMetadata ??
            outerStep?.butterSwapTransactionMetadata ??
            innerStep?.transactionData ??
            innerStep?.relayTransactionMetadata ??
            innerStep?.butterSwapTransactionMetadata

          if (!transactionData) {
            throw new Error(
              `No transaction data returned. Response keys: ${Object.keys(quote).join(', ')}`,
            )
          }

          const txData = transactionData as {
            type?: string
            to: string
            data: string
            value?: string
            gasLimit?: string
          }

          if (txData.type && txData.type !== 'evm') {
            throw new Error(
              `Expected EVM transaction data but got type '${txData.type}'. Check swapper configuration.`,
            )
          }

          if (!txData.to || !txData.data) {
            throw new Error(`Invalid EVM transaction data: missing 'to' or 'data' fields.`)
          }

          const txHash = await client.sendTransaction({
            to: txData.to as `0x${string}`,
            data: txData.data as `0x${string}`,
            value: BigInt(txData.value ?? '0'),
            gas: txData.gasLimit ? BigInt(txData.gasLimit) : undefined,
            chain,
            account: walletAddress as `0x${string}`,
          })

          actorRef.send({ type: 'EXECUTE_SUCCESS', txHash })
        } else if (context.isSellAssetUtxo) {
          if (!bitcoin.isConnected || !bitcoin.address) {
            actorRef.send({ type: 'EXECUTE_ERROR', error: 'Bitcoin wallet not connected' })
            return
          }

          bitcoin.reset()

          const outerStep = quote.steps?.[0]
          const innerStep = quote.quote?.steps?.[0]
          const transactionData =
            quote.transactionData ?? outerStep?.transactionData ?? innerStep?.transactionData

          if (!transactionData) {
            throw new Error(
              `No transaction data returned. Response keys: ${Object.keys(quote).join(', ')}`,
            )
          }

          let txid: string

          if (transactionData.type === 'utxo_deposit') {
            txid = await bitcoin.sendTransfer({
              recipientAddress: transactionData.depositAddress,
              amount: transactionData.value,
              memo: transactionData.memo,
            })
          } else {
            throw new Error(
              `Unsupported UTXO transaction type: ${transactionData.type}. Only utxo_deposit is supported.`,
            )
          }

          actorRef.send({ type: 'EXECUTE_SUCCESS', txHash: txid })
        } else if (context.isSellAssetSolana) {
          if (!solana.isConnected || !solana.address || !solana.connection) {
            actorRef.send({ type: 'EXECUTE_ERROR', error: 'Solana wallet not connected' })
            return
          }

          solana.reset()

          const outerStep = quote.steps?.[0]
          const innerStep = quote.quote?.steps?.[0]

          const txData = outerStep?.transactionData ?? innerStep?.transactionData

          if (!txData || txData.type !== 'solana') {
            throw new Error(
              `No Solana transaction metadata returned. Response keys: ${Object.keys(quote).join(
                ', ',
              )}`,
            )
          }

          const { Transaction, PublicKey, TransactionInstruction } = await import('@solana/web3.js')

          const instructions = txData.instructions.map(ix => {
            const keys = ix.keys.map(key => ({
              pubkey: new PublicKey(key.pubkey),
              isSigner: key.isSigner,
              isWritable: key.isWritable,
            }))

            return new TransactionInstruction({
              keys,
              programId: new PublicKey(ix.programId),
              data: Buffer.from(ix.data, 'base64'),
            })
          })

          const transaction = new Transaction().add(...instructions)
          const conn = solana.connection as {
            getLatestBlockhash: (commitment: string) => Promise<{ blockhash: string }>
          }
          const { blockhash } = await conn.getLatestBlockhash('confirmed')
          transaction.recentBlockhash = blockhash
          transaction.feePayer = new PublicKey(solana.address)

          const signature = await solana.sendTransaction({ transaction })
          actorRef.send({ type: 'EXECUTE_SUCCESS', txHash: signature })
        } else {
          actorRef.send({ type: 'EXECUTE_ERROR', error: 'Unsupported chain type' })
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
            ? error
            : JSON.stringify(error) ?? 'Transaction failed'
        actorRef.send({ type: 'EXECUTE_ERROR', error: errorMessage })
      } finally {
        executingRef.current = false
      }
    }

    executeSwap()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateValue is the sole trigger; other deps are stable refs read from snapshot
  }, [stateValue])
}

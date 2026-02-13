import { useEffect, useRef } from 'react'
import type { WalletClient } from 'viem'

import { getBaseAsset } from '../constants/chains'
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

          const baseAsset = getBaseAsset(context.sellAsset.chainId)
          const nativeCurrency = baseAsset
            ? { name: baseAsset.name, symbol: baseAsset.symbol, decimals: baseAsset.precision }
            : { name: 'ETH', symbol: 'ETH', decimals: 18 }

          const viemChain = VIEM_CHAINS_BY_ID[requiredChainId]
          const chain = viemChain ?? {
            id: requiredChainId,
            name: baseAsset?.networkName ?? baseAsset?.name ?? 'Chain',
            nativeCurrency,
            rpcUrls: { default: { http: [] } },
          }

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

          const to = transactionData.to as string
          const data = transactionData.data as string
          const value = transactionData.value ?? '0'
          const gasLimit = transactionData.gasLimit as string | undefined

          const txHash = await client.sendTransaction({
            to: to as `0x${string}`,
            data: data as `0x${string}`,
            value: BigInt(value),
            gas: gasLimit ? BigInt(gasLimit) : undefined,
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

          const psbt = (transactionData as { psbt?: string }).psbt
          const recipientAddress = transactionData.to
          const value = transactionData.value ?? context.sellAmountBaseUnit

          let txid: string

          if (psbt) {
            txid = await bitcoin.signPsbt({ psbt, signInputs: {}, broadcast: true })
          } else if (recipientAddress) {
            txid = await bitcoin.sendTransfer({ recipientAddress, amount: value ?? '' })
          } else {
            throw new Error('No PSBT or recipient address in transaction data')
          }

          actorRef.send({ type: 'EXECUTE_SUCCESS', txHash: txid })
        } else if (context.isSellAssetSolana) {
          if (!solana.isConnected || !solana.address || !solana.connection) {
            actorRef.send({ type: 'EXECUTE_ERROR', error: 'Solana wallet not connected' })
            return
          }

          solana.reset()

          const innerStep = quote.quote?.steps?.[0]
          const solanaTransactionMetadata = (innerStep as Record<string, unknown> | undefined)
            ?.solanaTransactionMetadata as
            | {
                instructions: {
                  programId: string
                  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[]
                  data: { data: number[] }
                }[]
              }
            | undefined

          if (!solanaTransactionMetadata?.instructions) {
            throw new Error(
              `No Solana transaction metadata returned. Response keys: ${Object.keys(quote).join(
                ', ',
              )}`,
            )
          }

          const { Transaction, PublicKey, TransactionInstruction } = await import('@solana/web3.js')

          const instructions = solanaTransactionMetadata.instructions.map(
            (ix: {
              programId: string
              keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[]
              data: { data: number[] }
            }) => {
              const keys = ix.keys.map(
                (key: { pubkey: string; isSigner: boolean; isWritable: boolean }) => ({
                  pubkey: new PublicKey(key.pubkey),
                  isSigner: key.isSigner,
                  isWritable: key.isWritable,
                }),
              )

              if (!ix.data?.data) {
                throw new Error(`Invalid instruction data for programId: ${ix.programId}`)
              }
              const data = Buffer.from(ix.data.data)

              return new TransactionInstruction({
                keys,
                programId: new PublicKey(ix.programId),
                data,
              })
            },
          )

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
        const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
        actorRef.send({ type: 'EXECUTE_ERROR', error: errorMessage })
      } finally {
        executingRef.current = false
      }
    }

    executeSwap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue])
}

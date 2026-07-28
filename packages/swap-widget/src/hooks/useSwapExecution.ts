import { useEffect, useRef } from 'react'
import type { Hex, WalletClient } from 'viem'
import { getAddress } from 'viem'

import { switchOrAddChain, VIEM_CHAINS_BY_ID } from '../constants/viemChains'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { EvmTransactionData, SolanaTransactionData, UtxoTransactionData } from '../types'
import { getErrorMessage } from '../utils/errors'

type BitcoinSigner = ReturnType<typeof useSwapWallet>['bitcoin']
type SolanaSigner = ReturnType<typeof useSwapWallet>['solana']

const executeEvm = async (
  txData: EvmTransactionData,
  walletClient: unknown,
  walletAddress: string | undefined,
): Promise<string> => {
  if (!walletClient || !walletAddress) throw new Error('No wallet connected')

  if (!txData.to || !txData.data) {
    console.error('Incomplete EVM transaction data', txData)
    throw new Error('Failed to execute swap — please try again')
  }

  const client = walletClient as WalletClient
  const requiredChainId = txData.chainId

  const currentChainId = await client.getChainId()
  if (currentChainId !== requiredChainId) {
    await switchOrAddChain(client, requiredChainId)
  }

  const chain = VIEM_CHAINS_BY_ID[requiredChainId]
  if (!chain) {
    console.error('Missing viem chain config for EVM chain ID', requiredChainId)
    throw new Error('This network is not yet supported — please try a different route')
  }

  return client.sendTransaction({
    to: getAddress(txData.to),
    data: txData.data as Hex,
    value: BigInt(txData.value ?? '0'),
    gas: txData.gasLimit ? BigInt(txData.gasLimit) : undefined,
    chain,
    account: getAddress(walletAddress),
  })
}

const executeUtxo = (txData: UtxoTransactionData, bitcoin: BitcoinSigner): Promise<string> => {
  if (!bitcoin.isConnected || !bitcoin.address) throw new Error('Bitcoin wallet not connected')

  bitcoin.reset()

  return bitcoin.sendTransfer({
    recipientAddress: txData.to,
    amount: txData.value,
    memo: txData.opReturnData,
  })
}

const executeSolana = async (
  txData: SolanaTransactionData,
  solana: SolanaSigner,
): Promise<string> => {
  if (!solana.isConnected || !solana.address || !solana.connection) {
    throw new Error('Solana wallet not connected')
  }

  solana.reset()

  const {
    AddressLookupTableAccount,
    ComputeBudgetProgram,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
  } = await import('@solana/web3.js')

  const instructions = txData.instructions.map(ix => {
    return new TransactionInstruction({
      keys: ix.keys.map(key => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      programId: new PublicKey(ix.programId),
      data: Buffer.from(ix.data, 'base64'),
    })
  })

  const conn = solana.connection as {
    getLatestBlockhash: (commitment: string) => Promise<{ blockhash: string }>
    getAddressLookupTable: (
      key: InstanceType<typeof PublicKey>,
    ) => Promise<{ value: InstanceType<typeof AddressLookupTableAccount> | null }>
    getRecentPrioritizationFees: () => Promise<{ prioritizationFee: number }[]>
  }

  // Quote instructions carry the static compute unit limit - append only the dynamic priority
  // fee here; plain native transfers carry no compute budget and broadcast without one
  const includeComputeBudget = instructions.some(ix =>
    ix.programId.equals(ComputeBudgetProgram.programId),
  )

  if (includeComputeBudget) {
    const recentFees = await conn.getRecentPrioritizationFees()
    const fees = recentFees
      .map(fee => fee.prioritizationFee)
      .filter(fee => fee > 0)
      .sort((a, b) => a - b)
    // 75th percentile of recent fees approximates a fast priority fee
    const priorityFee = fees[Math.floor(fees.length * 0.75)] ?? 0

    if (priorityFee > 0) {
      instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }))
    }
  }

  const lookupTableAccounts = (
    await Promise.all(
      txData.addressLookupTableAddresses.map(async address => {
        const { value } = await conn.getAddressLookupTable(new PublicKey(address))
        return value
      }),
    )
  ).filter(
    (account): account is InstanceType<typeof AddressLookupTableAccount> => account !== null,
  )

  const { blockhash } = await conn.getLatestBlockhash('confirmed')

  const message = new TransactionMessage({
    payerKey: new PublicKey(solana.address),
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts)

  return solana.sendTransaction({ transaction: new VersionedTransaction(message) })
}

export const useSwapExecution = () => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const actorRef = SwapMachineCtx.useActorRef()

  const { evm, bitcoin, solana } = useSwapWallet()
  const { walletClient, address: walletAddress } = evm

  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'executing' || executingRef.current) return
    executingRef.current = true

    const executeSwap = async () => {
      try {
        const quote = actorRef.getSnapshot().context.quote
        if (!quote) {
          console.error('Reached executing state without a quote in context')
          actorRef.send({
            type: 'EXECUTE_ERROR',
            error: 'Failed to execute swap — please try again',
          })
          return
        }

        const txData = quote.steps[0]?.transactionData
        if (!txData) {
          console.error('Quote missing transactionData in steps[0]', quote)
          actorRef.send({
            type: 'EXECUTE_ERROR',
            error: 'Failed to execute swap — please try again',
          })
          return
        }

        const txHash = await ((): Promise<string> => {
          switch (txData.type) {
            case 'evm':
              return executeEvm(txData, walletClient, walletAddress)
            case 'utxo':
              return executeUtxo(txData, bitcoin)
            case 'solana':
              return executeSolana(txData, solana)
            case 'cosmossdk_msg_send':
            case 'cosmossdk_msg_deposit':
              throw new Error('This swap is not yet supported — please try a different route')
            default: {
              const _exhaustive: never = txData
              console.error(
                'Unhandled transaction data type',
                (_exhaustive as { type?: string }).type,
              )
              throw new Error('Failed to execute swap — please try again')
            }
          }
        })()

        actorRef.send({ type: 'EXECUTE_SUCCESS', txHash })
      } catch (error) {
        actorRef.send({
          type: 'EXECUTE_ERROR',
          error: getErrorMessage(error, 'Failed to execute swap — please try again'),
        })
      } finally {
        executingRef.current = false
      }
    }

    executeSwap()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fire on state machine transitions; wallet handles close over the latest render
  }, [stateValue])
}

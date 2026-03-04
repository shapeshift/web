import { useAppKitProvider } from '@reown/appkit/react'
import type { Provider } from '@reown/appkit-adapter-solana/react'
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import type { Transaction, VersionedTransaction } from '@solana/web3.js'
import { useCallback, useMemo, useState } from 'react'

import { checkSolanaStatus, waitForSolanaConfirmation } from '../services/transactionStatus'

type AnyTransaction = Transaction | VersionedTransaction
type TransactionSignature = string | { toString: () => string }
type MessageSignature = Uint8Array

type SolanaProviderExtended = Provider & {
  sendTransaction?: (
    transaction: AnyTransaction,
    connection: unknown,
  ) => Promise<TransactionSignature>
  signTransaction?: <T extends AnyTransaction>(transaction: T) => Promise<T>
  signMessage?: (message: Uint8Array) => Promise<MessageSignature>
}

export type SendTransactionParams = {
  transaction: Transaction | VersionedTransaction
}

export type SignMessageParams = {
  message: Uint8Array | string
}

export type SolanaSigningState = {
  isLoading: boolean
  error: string | undefined
  signature: string | undefined
}

export type UseSolanaSigningResult = {
  isConnected: boolean
  address: string | undefined
  connection: ReturnType<typeof useAppKitConnection>['connection']
  sendTransaction: (params: SendTransactionParams) => Promise<string>
  signMessage: (params: SignMessageParams) => Promise<Uint8Array>
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>
  state: SolanaSigningState
  reset: () => void
  checkTxStatus: (signature: string) => ReturnType<typeof checkSolanaStatus>
  waitForConfirmation: (
    signature: string,
    commitment?: 'confirmed' | 'finalized',
  ) => ReturnType<typeof waitForSolanaConfirmation>
}

export const useSolanaSigning = (): UseSolanaSigningResult => {
  const { walletProvider } = useAppKitProvider<Provider>('solana')
  const provider = walletProvider as SolanaProviderExtended | undefined
  const { connection } = useAppKitConnection()

  const [state, setState] = useState<SolanaSigningState>({
    isLoading: false,
    error: undefined,
    signature: undefined,
  })

  const address = useMemo(() => {
    if (!provider) {
      return undefined
    }

    try {
      const publicKey = provider.publicKey
      if (!publicKey) {
        return undefined
      }

      const addressStr = publicKey?.toBase58?.() ?? publicKey?.toString?.() ?? undefined
      return addressStr
    } catch {
      return undefined
    }
  }, [provider])

  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<string> => {
      if (!provider?.sendTransaction) {
        throw new Error('Solana wallet not connected')
      }

      if (!connection) {
        throw new Error('Solana connection not available')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined, signature: undefined }))

      try {
        const signature: TransactionSignature = await provider.sendTransaction(
          params.transaction,
          connection,
        )

        const signatureStr = typeof signature === 'string' ? signature : signature.toString()

        if (!signatureStr) {
          throw new Error('Transaction submitted but no signature returned')
        }

        setState(prev => ({ ...prev, isLoading: false, signature: signatureStr }))
        return signatureStr
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send Solana transaction'

        if (
          errorMessage.toLowerCase().includes('rejected') ||
          errorMessage.toLowerCase().includes('denied') ||
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('user refused') ||
          errorMessage.toLowerCase().includes('user rejected')
        ) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Transaction rejected by user' }))
          throw new Error('Transaction rejected by user')
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [provider, connection],
  )

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
      if (!provider?.signTransaction) {
        throw new Error('Solana wallet not connected or does not support signTransaction')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined }))

      try {
        const signedTransaction = await provider.signTransaction(transaction)

        setState(prev => ({ ...prev, isLoading: false }))
        return signedTransaction as T
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction'

        if (
          errorMessage.toLowerCase().includes('rejected') ||
          errorMessage.toLowerCase().includes('denied') ||
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('user refused') ||
          errorMessage.toLowerCase().includes('user rejected')
        ) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Signing rejected by user' }))
          throw new Error('Signing rejected by user')
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [provider],
  )

  const signMessage = useCallback(
    async (params: SignMessageParams): Promise<Uint8Array> => {
      if (!provider?.signMessage) {
        throw new Error('Solana wallet not connected or does not support signMessage')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined }))

      try {
        const messageBytes =
          typeof params.message === 'string'
            ? new TextEncoder().encode(params.message)
            : params.message

        const signature = await provider.signMessage(messageBytes)

        setState(prev => ({ ...prev, isLoading: false }))
        return signature
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign message'

        if (
          errorMessage.toLowerCase().includes('rejected') ||
          errorMessage.toLowerCase().includes('denied') ||
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('user refused') ||
          errorMessage.toLowerCase().includes('user rejected')
        ) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Message signing rejected by user',
          }))
          throw new Error('Message signing rejected by user')
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [provider],
  )

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: undefined,
      signature: undefined,
    })
  }, [])

  const checkTxStatus = useCallback(
    (signature: string) => {
      if (!connection) {
        return Promise.resolve({
          status: 'pending' as const,
          error: 'Solana connection not available',
        })
      }
      return checkSolanaStatus(
        signature,
        connection as unknown as Parameters<typeof checkSolanaStatus>[1],
      )
    },
    [connection],
  )

  const waitForConfirmation = useCallback(
    (signature: string, commitment: 'confirmed' | 'finalized' = 'confirmed') => {
      if (!connection) {
        return Promise.resolve({
          status: 'failed' as const,
          error: 'Solana connection not available',
        })
      }
      return waitForSolanaConfirmation(
        signature,
        connection as unknown as Parameters<typeof waitForSolanaConfirmation>[1],
        commitment,
      )
    },
    [connection],
  )

  const actuallyConnected = !!address && !!connection

  return useMemo(
    () => ({
      isConnected: actuallyConnected,
      address,
      connection,
      sendTransaction,
      signTransaction,
      signMessage,
      state,
      reset,
      checkTxStatus,
      waitForConfirmation,
    }),
    [
      actuallyConnected,
      address,
      connection,
      sendTransaction,
      signTransaction,
      signMessage,
      state,
      reset,
      checkTxStatus,
      waitForConfirmation,
    ],
  )
}

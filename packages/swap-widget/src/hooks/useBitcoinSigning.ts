import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useCallback, useMemo, useState } from 'react'

import { checkBitcoinStatus } from '../services/transactionStatus'

export type SendTransferParams = {
  recipientAddress: string
  amount: string
  memo?: string
}

export type SignPsbtParams = {
  psbt: string
  signInputs: Record<string, number[]>
  broadcast?: boolean
}

export type BitcoinSigningState = {
  isLoading: boolean
  error: string | undefined
  txid: string | undefined
}

export type UseBitcoinSigningResult = {
  isConnected: boolean
  address: string | undefined
  sendTransfer: (params: SendTransferParams) => Promise<string>
  signPsbt: (params: SignPsbtParams) => Promise<string>
  signMessage: (message: string) => Promise<string>
  getAccountAddresses: () => Promise<string[]>
  state: BitcoinSigningState
  reset: () => void
  checkTxStatus: (txid: string, network?: 'mainnet' | 'testnet') => ReturnType<typeof checkBitcoinStatus>
}

export const useBitcoinSigning = (): UseBitcoinSigningResult => {
  const { walletProvider, isConnected } = useAppKitProvider<BitcoinConnector>('bip122')

  const [state, setState] = useState<BitcoinSigningState>({
    isLoading: false,
    error: undefined,
    txid: undefined,
  })

  const address = useMemo(() => {
    if (!walletProvider || !isConnected) return undefined

    try {
      const accounts = walletProvider.getAccountAddresses?.()
      if (accounts && accounts.length > 0) {
        const nativeSegwitAccount = accounts.find(
          (account: { purpose?: string }) => account.purpose === 'payment' || account.purpose === '84'
        )
        const accountToUse = nativeSegwitAccount ?? accounts[0]
        return typeof accountToUse === 'string' ? accountToUse : accountToUse?.address
      }
    } catch {
      return undefined
    }
    return undefined
  }, [walletProvider, isConnected])

  const sendTransfer = useCallback(
    async (params: SendTransferParams): Promise<string> => {
      if (!walletProvider) {
        throw new Error('Bitcoin wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined, txid: undefined }))

      try {
        const result = await walletProvider.sendTransfer({
          recipientAddress: params.recipientAddress,
          amount: params.amount,
          ...(params.memo && { memo: params.memo }),
        })

        const txid = typeof result === 'string' ? result : result?.txid ?? result?.hash ?? ''

        if (!txid) {
          throw new Error('Transaction submitted but no txid returned')
        }

        setState(prev => ({ ...prev, isLoading: false, txid }))
        return txid
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to send Bitcoin transfer'

        if (
          errorMessage.toLowerCase().includes('rejected') ||
          errorMessage.toLowerCase().includes('denied') ||
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('user refused')
        ) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Transaction rejected by user' }))
          throw new Error('Transaction rejected by user')
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [walletProvider],
  )

  const signPsbt = useCallback(
    async (params: SignPsbtParams): Promise<string> => {
      if (!walletProvider) {
        throw new Error('Bitcoin wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined, txid: undefined }))

      try {
        const result = await walletProvider.signPsbt({
          psbt: params.psbt,
          signInputs: params.signInputs,
          broadcast: params.broadcast ?? true,
        })

        const txidOrPsbt = typeof result === 'string' ? result : result?.txid ?? result?.psbt ?? ''

        if (params.broadcast !== false) {
          setState(prev => ({ ...prev, isLoading: false, txid: txidOrPsbt }))
        } else {
          setState(prev => ({ ...prev, isLoading: false }))
        }

        return txidOrPsbt
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign PSBT'

        if (
          errorMessage.toLowerCase().includes('rejected') ||
          errorMessage.toLowerCase().includes('denied') ||
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('user refused')
        ) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Signing rejected by user' }))
          throw new Error('Signing rejected by user')
        }

        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [walletProvider],
  )

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!walletProvider) {
        throw new Error('Bitcoin wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined }))

      try {
        const signature = await walletProvider.signMessage({
          message,
          address: address ?? '',
        })

        const signatureStr = typeof signature === 'string' ? signature : signature?.signature ?? ''

        setState(prev => ({ ...prev, isLoading: false }))
        return signatureStr
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign message'
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [walletProvider, address],
  )

  const getAccountAddresses = useCallback(async (): Promise<string[]> => {
    if (!walletProvider) {
      return []
    }

    try {
      const accounts = walletProvider.getAccountAddresses?.()
      if (!accounts) return []

      return accounts.map((account: string | { address?: string }) =>
        typeof account === 'string' ? account : account?.address ?? ''
      ).filter(Boolean)
    } catch {
      return []
    }
  }, [walletProvider])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: undefined,
      txid: undefined,
    })
  }, [])

  const checkTxStatus = useCallback(
    (txid: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
      return checkBitcoinStatus(txid, network)
    },
    [],
  )

  return useMemo(
    () => ({
      isConnected,
      address,
      sendTransfer,
      signPsbt,
      signMessage,
      getAccountAddresses,
      state,
      reset,
      checkTxStatus,
    }),
    [isConnected, address, sendTransfer, signPsbt, signMessage, getAccountAddresses, state, reset, checkTxStatus],
  )
}

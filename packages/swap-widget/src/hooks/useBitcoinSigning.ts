import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { checkBitcoinStatus } from '../services/transactionStatus'

type AccountAddress = string | { address?: string; purpose?: string }

type AccountAddressArray = AccountAddress[]

type BitcoinConnectorExtended = BitcoinConnector & {
  getAccountAddresses?: () => Promise<AccountAddressArray> | AccountAddressArray
  sendTransfer?: (params: {
    recipientAddress: string
    amount: string
    memo?: string
  }) => Promise<string | { txid?: string; hash?: string }>
  signPSBT?: (params: {
    psbt: string
    signInputs: Record<string, number[]>
    broadcast?: boolean
  }) => Promise<string | { txid?: string; psbt?: string }>
  signMessage?: (params: {
    message: string
    address: string
  }) => Promise<string | { signature?: string }>
}

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
  checkTxStatus: (
    txid: string,
    network?: 'mainnet' | 'testnet',
  ) => ReturnType<typeof checkBitcoinStatus>
}

export const useBitcoinSigning = (): UseBitcoinSigningResult => {
  const { walletProvider } = useAppKitProvider<BitcoinConnector>('bip122')
  const provider = walletProvider as BitcoinConnectorExtended | undefined

  const [state, setState] = useState<BitcoinSigningState>({
    isLoading: false,
    error: undefined,
    txid: undefined,
  })

  const [address, setAddress] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!provider) {
      setAddress(undefined)
      return
    }

    const fetchAddress = async () => {
      try {
        const accountsResult = provider.getAccountAddresses?.()

        const accounts: AccountAddressArray | undefined =
          accountsResult instanceof Promise
            ? await accountsResult
            : (accountsResult as AccountAddressArray | undefined)

        if (accounts && Array.isArray(accounts) && accounts.length > 0) {
          const taprootByPurpose = accounts.find(
            (account: AccountAddress) =>
              typeof account !== 'string' && (account.purpose === '86' || account.purpose === 86),
          )

          const taprootByPrefix = accounts.find((account: AccountAddress) => {
            const addr = typeof account === 'string' ? account : account?.address
            return addr?.startsWith('bc1p')
          })

          const nativeSegwitAccount = accounts.find(
            (account: AccountAddress) =>
              typeof account !== 'string' && (account.purpose === '84' || account.purpose === 84),
          )
          const paymentAccount = accounts.find(
            (account: AccountAddress) =>
              typeof account !== 'string' && account.purpose === 'payment',
          )

          const accountToUse =
            taprootByPurpose ??
            taprootByPrefix ??
            nativeSegwitAccount ??
            paymentAccount ??
            accounts[0]
          const addr = typeof accountToUse === 'string' ? accountToUse : accountToUse?.address
          setAddress(addr)
        } else {
          setAddress(undefined)
        }
      } catch {
        setAddress(undefined)
      }
    }

    fetchAddress()
  }, [provider])

  const sendTransfer = useCallback(
    async (params: SendTransferParams): Promise<string> => {
      if (!provider?.sendTransfer) {
        throw new Error('Bitcoin wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined, txid: undefined }))

      try {
        const result = await provider.sendTransfer({
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
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send Bitcoin transfer'

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
    [provider],
  )

  const signPsbt = useCallback(
    async (params: SignPsbtParams): Promise<string> => {
      if (!provider?.signPSBT) {
        throw new Error('Bitcoin wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined, txid: undefined }))

      try {
        const result = await provider.signPSBT({
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
    [provider],
  )

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!provider?.signMessage) {
        throw new Error('Bitcoin wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined }))

      try {
        const signature = await provider.signMessage({
          message,
          address: address ?? '',
        })

        const signatureObj = signature as string | { signature?: string }
        const signatureStr =
          typeof signatureObj === 'string'
            ? signatureObj
            : (signatureObj && typeof signatureObj === 'object' && 'signature' in signatureObj
                ? signatureObj.signature
                : '') ?? ''

        setState(prev => ({ ...prev, isLoading: false }))
        return signatureStr
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign message'
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [provider, address],
  )

  const getAccountAddresses = useCallback(async (): Promise<string[]> => {
    if (!provider) {
      return []
    }

    try {
      const accountsResult = provider.getAccountAddresses?.()
      const accounts: AccountAddressArray | undefined =
        accountsResult instanceof Promise
          ? await accountsResult
          : (accountsResult as AccountAddressArray | undefined)

      if (!accounts || !Array.isArray(accounts)) return []

      return accounts
        .map((account: AccountAddress) => {
          if (typeof account === 'string') return account
          return account?.address ?? ''
        })
        .filter((addr: string | undefined): addr is string => Boolean(addr))
    } catch {
      return []
    }
  }, [provider])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: undefined,
      txid: undefined,
    })
  }, [])

  const checkTxStatus = useCallback((txid: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    return checkBitcoinStatus(txid, network)
  }, [])

  const isConnected = !!provider && !!address

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
    [
      isConnected,
      address,
      sendTransfer,
      signPsbt,
      signMessage,
      getAccountAddresses,
      state,
      reset,
      checkTxStatus,
    ],
  )
}

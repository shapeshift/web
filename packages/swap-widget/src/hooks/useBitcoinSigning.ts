import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useCallback, useMemo, useState } from 'react'

import {
  broadcastBitcoinTx,
  getBitcoinFeePerByte,
  getBitcoinTxHex,
  getBitcoinUtxos,
} from '../api/unchained'
import { buildTransferPsbt, finalizeSignedPsbt } from '../utils/bitcoinPsbt'
import { getErrorMessage, isUserRejection } from '../utils/errors'

type AccountAddress = string | { address?: string; purpose?: string | number }

type AccountAddressArray = AccountAddress[]

export type SignInput = {
  address: string
  index: number
  sighashTypes?: number[]
}

type BitcoinConnectorExtended = BitcoinConnector & {
  wallet?: { id?: string }
  getAccountAddresses?: () => Promise<AccountAddressArray> | AccountAddressArray
  signPSBT?: (params: {
    psbt: string
    signInputs: SignInput[]
    broadcast?: boolean
  }) => Promise<string | { txid?: string; psbt?: string }>
  signMessage?: (params: {
    message: string
    address: string
  }) => Promise<string | { signature?: string }>
}

export type BitcoinSendTransactionParams = {
  to: string
  value: string
  opReturnData: string | undefined
}

export type SignPsbtParams = {
  psbt: string
  signInputs: SignInput[]
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
  sendTransaction: (params: BitcoinSendTransactionParams) => Promise<string>
  signPsbt: (params: SignPsbtParams) => Promise<string>
  signMessage: (message: string) => Promise<string>
  getAccountAddresses: () => Promise<string[]>
  state: BitcoinSigningState
  reset: () => void
}

// AppKit forwards only the first signInputs index to Leather, while omitting it has Leather sign all inputs
const LEATHER_PROVIDER_ID = 'LeatherProvider'

const REJECTED_BY_USER = 'Transaction rejected by user'

const toWalletError = (error: unknown): unknown =>
  isUserRejection(getErrorMessage(error, '')) ? new Error(REJECTED_BY_USER) : error

export const useBitcoinSigning = (): UseBitcoinSigningResult => {
  const { walletProvider } = useAppKitProvider<BitcoinConnector>('bip122')
  const provider = walletProvider as BitcoinConnectorExtended | undefined

  const [state, setState] = useState<BitcoinSigningState>({
    isLoading: false,
    error: undefined,
    txid: undefined,
  })

  const {
    address: appKitBtcAddress,
    allAccounts: btcAccounts,
    isConnected: isBtcConnected,
  } = useAppKitAccount({ namespace: 'bip122' })

  const address = useMemo(() => {
    if (!provider || !isBtcConnected) return undefined
    return appKitBtcAddress ?? btcAccounts[0]?.address
  }, [provider, isBtcConnected, appKitBtcAddress, btcAccounts])

  const sendTransaction = useCallback(
    async (params: BitcoinSendTransactionParams): Promise<string> => {
      if (!provider?.signPSBT || !address) throw new Error('Bitcoin wallet not connected')

      setState(prev => ({ ...prev, isLoading: true, error: undefined, txid: undefined }))

      try {
        const [utxos, feePerByte] = await Promise.all([
          getBitcoinUtxos(address),
          getBitcoinFeePerByte(),
        ])

        const { psbt, signInputs } = await buildTransferPsbt({
          address,
          publicKey: btcAccounts.find(account => account.address === address)?.publicKey,
          utxos,
          getPrevTxHex: getBitcoinTxHex,
          to: params.to,
          amount: BigInt(params.value),
          opReturnData: params.opReturnData,
          feePerByte,
        })

        const signed = await provider
          .signPSBT({
            psbt,
            signInputs: provider.wallet?.id === LEATHER_PROVIDER_ID ? [] : signInputs,
            broadcast: false,
          })
          .catch(error => {
            throw toWalletError(error)
          })

        const signedPsbt = typeof signed === 'string' ? signed : signed?.psbt
        if (!signedPsbt) throw new Error('Wallet did not return a signed transaction')

        const { txHex, txid } = finalizeSignedPsbt({ signedPsbt })
        await broadcastBitcoinTx(txHex)

        setState(prev => ({ ...prev, isLoading: false, txid }))
        return txid
      } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to send Bitcoin transaction')
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw error
      }
    },
    [provider, address, btcAccounts],
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
        const errorMessage = getErrorMessage(error, 'Failed to sign PSBT')

        if (isUserRejection(errorMessage)) {
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

      if (!address) {
        const errorMessage = 'No Bitcoin address available to sign with'
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        throw new Error(errorMessage)
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined }))

      try {
        const signature = await provider.signMessage({
          message,
          address,
        })

        const signatureObj = signature as string | { signature?: string }
        const signatureStr =
          typeof signatureObj === 'string'
            ? signatureObj
            : (signatureObj && typeof signatureObj === 'object' && 'signature' in signatureObj
                ? signatureObj.signature
                : '') ?? ''

        if (!signatureStr) {
          throw new Error('Signing succeeded but no signature returned')
        }

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

  const isConnected = !!provider && !!address

  return useMemo(
    () => ({
      isConnected,
      address,
      sendTransaction,
      signPsbt,
      signMessage,
      getAccountAddresses,
      state,
      reset,
    }),
    [
      isConnected,
      address,
      sendTransaction,
      signPsbt,
      signMessage,
      getAccountAddresses,
      state,
      reset,
    ],
  )
}

import { createContext, useContext } from 'react'

import type { UseBitcoinSigningResult } from '../hooks/useBitcoinSigning'
import type { UseEvmSigningResult } from '../hooks/useEvmSigning'
import type { UseSolanaSigningResult } from '../hooks/useSolanaSigning'

export type SwapWalletContextValue = {
  // What the api's sendAddress field gets: a connected wallet's address, else the typed refund one
  sendAddress: string | undefined
  // Connection state - absent on a deposit flow, where nothing is signed
  walletSendAddress: string | undefined
  setCustomRefundAddress: (address: string) => void
  receiveAddress: string | undefined
  isReceiveAddressResolving: boolean
  // A locked address the buy chain rejects - nothing can be quoted until the integrator fixes it
  isReceiveAddressBlocked: boolean
  customReceiveAddress: string
  setCustomReceiveAddress: (address: string) => void
  evm: UseEvmSigningResult
  bitcoin: UseBitcoinSigningResult
  solana: UseSolanaSigningResult
}

const SwapWalletContext = createContext<SwapWalletContextValue | null>(null)

export const SwapWalletProvider = SwapWalletContext.Provider

export const useSwapWallet = (): SwapWalletContextValue => {
  const ctx = useContext(SwapWalletContext)
  if (!ctx) throw new Error('useSwapWallet must be used within SwapWalletProvider')
  return ctx
}

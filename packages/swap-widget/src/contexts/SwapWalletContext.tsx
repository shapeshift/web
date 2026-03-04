import { createContext, useContext } from 'react'

import type { UseBitcoinSigningResult } from '../hooks/useBitcoinSigning'
import type { UseSolanaSigningResult } from '../hooks/useSolanaSigning'

export type SwapWalletContextValue = {
  walletClient: unknown
  walletAddress: string | undefined
  effectiveReceiveAddress: string
  isCustomAddress: boolean
  customReceiveAddress: string
  setCustomReceiveAddress: (address: string) => void
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

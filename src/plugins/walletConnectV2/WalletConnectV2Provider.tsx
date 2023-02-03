import type { WalletConnect } from 'plugins/walletConnectV2/types'
import { useWalletConnectEventsManager } from 'plugins/walletConnectV2/useWalletConnectEventsManager'
import { useWalletConnectWallet } from 'plugins/walletConnectV2/useWalletConnectWallet'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext } from 'react'

const WalletConnectContext = createContext<WalletConnect | undefined>(undefined)

export const WalletConnectV2Provider: FC<PropsWithChildren> = ({ children }) => {
  const { core, web3wallet } = useWalletConnectWallet()
  const isInitialized = !!core && !!web3wallet
  useWalletConnectEventsManager(isInitialized, web3wallet)

  if (!isInitialized)
    return (
      <WalletConnectContext.Provider value={undefined}>{children}</WalletConnectContext.Provider>
    )

  const pair = async (params: { uri: string }) => {
    return await core!.pairing.pair({ uri: params.uri })
  }

  return (
    <WalletConnectContext.Provider
      value={{
        core,
        web3wallet,
        pair,
      }}
    >
      {children}
    </WalletConnectContext.Provider>
  )
}

export function useWalletConnectV2() {
  const context = useContext(WalletConnectContext)
  if (context === undefined) {
    throw new Error('useWalletConnectV2 must be used within a WalletConnectV2Provider')
  }

  return context
}

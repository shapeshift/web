import { createConfig } from '@wagmi/core'
import { EthereumClient, w3mConnectors } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/react'
import { getConfig } from 'config'
import React, { createContext, useContext } from 'react'
import {
  walletConnectV2OptionalChains,
  walletConnectV2RequiredChains,
} from 'context/WalletProvider/WalletConnectV2/config'
import { viemClient } from 'lib/viem-client'

type Web3ModalProviderProps = {
  children: React.ReactNode
}

type Web3ModalContextType = {
  ethereumClient: EthereumClient
}

export const Web3ModalContext = createContext<Web3ModalContextType | undefined>(undefined)

// Initialization functions
const createEthereumClient = () => {
  const chains = [...walletConnectV2RequiredChains, ...walletConnectV2OptionalChains]
  const walletConnectProjectId = getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: w3mConnectors({ projectId: walletConnectProjectId, chains }),
    publicClient: viemClient,
  })

  return new EthereumClient(wagmiConfig, chains)
}

const ethereumClient: EthereumClient = createEthereumClient()

export const Web3ModalProvider = ({ children }: Web3ModalProviderProps) => {
  const walletConnectProjectId = getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID
  return (
    <Web3ModalContext.Provider value={{ ethereumClient }}>
      <Web3Modal projectId={walletConnectProjectId} ethereumClient={ethereumClient} />
      {children}
    </Web3ModalContext.Provider>
  )
}

export const useWeb3ModalProvider = () => {
  const context = useContext(Web3ModalContext)
  if (context === undefined) {
    throw new Error('useWeb3Modal must be used within a Web3ModalProvider')
  }

  return context
}

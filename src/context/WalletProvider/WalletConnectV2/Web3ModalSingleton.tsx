import { createConfig } from '@wagmi/core'
import { EthereumClient, w3mConnectors } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/react'
import { getConfig } from 'config'
import type { FC } from 'react'
import { mainnet } from 'viem/chains'
import { viemClient } from 'lib/viem-client'

// Initialization functions
function createEthereumClient() {
  const chains = [mainnet]
  const walletConnectProjectId = getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: w3mConnectors({ projectId: walletConnectProjectId, chains }),
    publicClient: viemClient,
  })

  return new EthereumClient(wagmiConfig, chains)
}

// Singleton instance
const ethereumClient: EthereumClient = createEthereumClient()

export const Web3ModalService: FC = () => {
  const walletConnectProjectId = getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID
  return <Web3Modal projectId={walletConnectProjectId} ethereumClient={ethereumClient} />
}

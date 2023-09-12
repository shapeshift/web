import { createConfig } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/react'
import type { FC } from 'react'
import { configureChains } from 'wagmi'

export const Web3ModalService: FC = () => {
  const chains = [mainnet]
  const walletConnectProjectId = '2f05ae7f1116030fde2d36508f472bfb'

  // FIXME: use viemClient instead if possible
  const { publicClient } = configureChains(chains, [
    w3mProvider({ projectId: walletConnectProjectId }),
  ])

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: w3mConnectors({ projectId: walletConnectProjectId, chains }),
    publicClient,
  })
  const ethereumClient = new EthereumClient(wagmiConfig, chains)

  return <Web3Modal projectId={walletConnectProjectId} ethereumClient={ethereumClient} />
}

import { createConfig } from '@wagmi/core'
import { EthereumClient, w3mConnectors } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/react'
import type { FC } from 'react'
import { mainnet } from 'viem/chains'
import { viemClient } from 'lib/viem-client'

export const Web3ModalService: FC = () => {
  const chains = [mainnet]
  const walletConnectProjectId = '2f05ae7f1116030fde2d36508f472bfb'

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: w3mConnectors({ projectId: walletConnectProjectId, chains }),
    publicClient: viemClient,
  })
  const ethereumClient = new EthereumClient(wagmiConfig, chains)

  return <Web3Modal projectId={walletConnectProjectId} ethereumClient={ethereumClient} />
}

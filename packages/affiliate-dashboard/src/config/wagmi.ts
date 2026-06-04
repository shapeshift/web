import { arbitrum } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!projectId) throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set')

export const wagmiAdapter = new WagmiAdapter({
  networks: [arbitrum],
  projectId,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [arbitrum],
  defaultNetwork: arbitrum,
  projectId,
  themeMode: 'dark',
  enableNetworkSwitch: false,
  allowUnsupportedChain: true,
  features: {
    send: false,
    receive: false,
  },
})

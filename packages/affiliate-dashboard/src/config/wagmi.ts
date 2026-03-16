import { arbitrum } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo'

const metadata = {
  name: 'ShapeShift Affiliate Dashboard',
  description: 'Manage your ShapeShift affiliate program',
  url: 'https://app.shapeshift.com',
  icons: [],
}

export const wagmiAdapter = new WagmiAdapter({
  networks: [arbitrum],
  projectId,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [arbitrum],
  defaultNetwork: arbitrum,
  projectId,
  metadata,
  themeMode: 'dark',
})

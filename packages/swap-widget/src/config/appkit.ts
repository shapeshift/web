import type { AppKitNetwork } from '@reown/appkit/networks'
import {
  arbitrum,
  avalanche,
  base,
  bitcoin,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet,
  monad,
  optimism,
  plasma,
  polygon,
  solana,
  worldchain,
} from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

const EVM_NETWORKS: readonly AppKitNetwork[] = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
  monad,
  hyperEvm,
  plasma,
  worldchain,
  katana,
]

const ALL_NETWORKS: readonly AppKitNetwork[] = [...EVM_NETWORKS, bitcoin, solana]

const APP_METADATA = {
  name: 'ShapeShift Swap Widget',
  description: 'Multi-chain swap widget powered by ShapeShift',
  url: 'https://shapeshift.com',
  icons: ['https://shapeshift.com/icon.png'],
}

let wagmiAdapter: WagmiAdapter | null = null
let appKitInitialized = false

export const getWagmiAdapter = (): WagmiAdapter | null => wagmiAdapter

export const isAppKitInitialized = (): boolean => appKitInitialized

export const initializeAppKit = (projectId: string): void => {
  if (appKitInitialized) return

  wagmiAdapter = new WagmiAdapter({
    networks: [...EVM_NETWORKS],
    projectId,
  })

  const bitcoinAdapter = new BitcoinAdapter()
  const solanaAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()] as any,
  })

  createAppKit({
    adapters: [wagmiAdapter, bitcoinAdapter, solanaAdapter],
    projectId,
    networks: [...ALL_NETWORKS] as [AppKitNetwork, ...AppKitNetwork[]],
    metadata: APP_METADATA,
  })

  appKitInitialized = true
}

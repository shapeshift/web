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
  megaeth,
  monad,
  optimism,
  plasma,
  polygon,
  solana,
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
  megaeth,
  hyperEvm,
  plasma,
  katana,
]

const ALL_NETWORKS: readonly AppKitNetwork[] = [...EVM_NETWORKS, bitcoin, solana]

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
    features: {
      send: false,
    },
  })

  appKitInitialized = true
}
